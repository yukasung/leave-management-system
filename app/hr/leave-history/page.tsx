import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { LeaveStatus } from '@prisma/client'
import Link from 'next/link'
import AdminLayout from '@/components/admin-layout'
import LeaveHistoryFilters from './LeaveHistoryFilters'
import { formatDate } from '@/lib/format-date'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import Pagination from '@/components/Pagination'
import { cn } from '@/lib/utils'
import LeaveHistoryRow from './LeaveHistoryRow'
import { STATUS_LABEL as STATUS_LABELS, STATUS_BADGE, STATUS_DOT } from '@/lib/leave-status'

const PAGE_SIZE = 10

const VALID_SORTS = ['name', 'department', 'leaveType', 'startDate', 'endDate', 'totalDays', 'status', 'createdAt'] as const
type SortKey = typeof VALID_SORTS[number]

type SearchParams = {
  employee?:      string
  dateFrom?:      string
  dateTo?:        string
  leaveTypeId?:   string
  leaveCategory?: string
  status?:        string
  departmentId?:  string
  sort?:          string
  dir?:           string
  page?:          string
}

export default async function LeaveHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user.isAdmin) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  })
  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  const {
    employee, dateFrom, dateTo, leaveTypeId, leaveCategory,
    status: statusParam, departmentId,
    sort: sortParam, dir: dirParam, page: pageParam,
  } = await searchParams

  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10))
  const skip        = (currentPage - 1) * PAGE_SIZE

  const VALID_STATUSES = Object.keys(LeaveStatus)
  const statusUpper = statusParam?.toUpperCase()
  const statusFilter = statusUpper && VALID_STATUSES.includes(statusUpper)
    ? (statusUpper as LeaveStatus)
    : undefined

  const sortKey: SortKey = (VALID_SORTS as readonly string[]).includes(sortParam ?? '')
    ? (sortParam as SortKey)
    : 'startDate'
  const sortDir: 'asc' | 'desc' = dirParam === 'asc' ? 'asc' : 'desc'

  const ORDER_BY: Record<SortKey, object> = {
    name:       { user: { name: sortDir } },
    department: { user: { department: { name: sortDir } } },
    leaveType:  { leaveType: { name: sortDir } },
    startDate:  { leaveStartDateTime: sortDir },
    endDate:    { leaveEndDateTime: sortDir },
    totalDays:  { totalDays: sortDir },
    status:     { status: sortDir },
    createdAt:  { createdAt: sortDir },
  }

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(leaveTypeId  ? { leaveTypeId } : {}),
    ...(leaveCategory ? { leaveType: { leaveCategory: leaveCategory as 'ANNUAL' | 'EVENT' } } : {}),
    ...(dateFrom || dateTo
      ? {
          leaveStartDateTime: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
    ...(employee || departmentId
      ? {
          user: {
            ...(employee     ? { name: { contains: employee, mode: 'insensitive' as const } } : {}),
            ...(departmentId ? { departmentId } : {}),
          },
        }
      : {}),
  }

  const [requests, total, departments, leaveTypes] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: ORDER_BY[sortKey],
      include: {
        user: {
          select: {
            name: true,
            employee: { select: { employeeCode: true } },
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true, leaveCategory: true } },
        approvals: {
          orderBy: { level: 'desc' },
          take: 1,
          include: { approver: { select: { name: true } } },
        },
      },
    }),
    prisma.leaveRequest.count({ where }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.leaveType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, leaveCategory: true } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── URL helpers ─────────────────────────────────────────────────────────────
  function buildQS(overrides: Record<string, string | undefined> = {}) {
    const merged = {
      employee:     employee     || undefined,
      dateFrom:     dateFrom     || undefined,
      dateTo:       dateTo       || undefined,
      leaveTypeId:  leaveTypeId  || undefined,
      leaveCategory: leaveCategory || undefined,
      status:       statusParam  || undefined,
      departmentId: departmentId || undefined,
      sort: sortKey !== 'startDate' ? sortKey : undefined,
      dir:  sortDir !== 'desc'   ? sortDir  : undefined,
      ...overrides,
    }
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v)
    return q.toString()
  }

  function sortUrl(col: string) {
    const newDir = sortKey === col && sortDir === 'desc' ? 'asc' : 'desc'
    return `/hr/leave-history?${buildQS({
      sort: col !== 'startDate' ? col : undefined,
      dir:  newDir !== 'desc'   ? newDir : undefined,
      page: undefined,
    })}`
  }

  // ── Sort header helper ───────────────────────────────────────────────────────
  type ColDef = { col: SortKey; label: string; className?: string; center?: boolean }
  const COLUMNS: ColDef[] = [
    { col: 'name',       label: 'ชื่อพนักงาน',    className: 'min-w-35' },
    { col: 'department', label: 'แผนก',            className: 'min-w-28', center: true },
    { col: 'leaveType',  label: 'หมวดหมู่ / ประเภทการลา',     className: 'min-w-40', center: true },
    { col: 'startDate',  label: 'วันที่เริ่ม',      className: 'min-w-25', center: true },
    { col: 'endDate',    label: 'วันที่สิ้นสุด',    className: 'min-w-25', center: true },
    { col: 'totalDays',  label: 'จำนวน (วัน)',        className: 'min-w-20', center: true },
    { col: 'status',     label: 'สถานะ',            className: 'min-w-30', center: true },
    { col: 'createdAt',  label: 'วันที่สร้าง',       className: 'min-w-25', center: true },
  ]

  return (
    <AdminLayout title="ประวัติการลาพนักงาน" user={user}>
      <div className="space-y-5 max-w-350 mx-auto">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">ประวัติการลาพนักงาน</h1>
          <p className="text-sm text-muted-foreground mt-0.5">ข้อมูลคำขอลาทั้งหมดในระบบ</p>
        </div>

        {/* Filters */}
        <LeaveHistoryFilters
          departments={departments}
          leaveTypes={leaveTypes}
          total={total}
          current={{ employee, dateFrom, dateTo, leaveTypeId, leaveCategory, status: statusParam, departmentId, sort: sortKey, dir: sortDir }}
        />

        {/* Table */}
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <p className="text-muted-foreground">ไม่พบรายการ</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-10">#</th>
                    {/* Employee ID — no sort */}
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-25">
                      รหัสพนักงาน
                    </th>
                    {COLUMNS.map(({ col, label, className, center }) => (
                      <th
                        key={col}
                        className={cn('px-3 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap', center ? 'text-center' : 'text-left', className)}
                      >
                        <Link
                          href={sortUrl(col)}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          {label}
                          {sortKey === col
                            ? sortDir === 'asc'
                              ? <ChevronUp className="h-3 w-3" />
                              : <ChevronDown className="h-3 w-3" />
                            : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                        </Link>
                      </th>
                    ))}
                    {/* Reason — no sort (long text) */}
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-35">
                      เหตุผล
                    </th>
                    {/* Approver — no sort */}
                    <th className="px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-30">
                      ผู้อนุมัติ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req, index) => (
                    <LeaveHistoryRow
                      key={req.id}
                      id={req.id}
                      rowNumber={skip + index + 1}
                      employeeCode={req.user.employee?.employeeCode ?? null}
                      userName={req.user.name}
                      departmentName={req.user.department?.name ?? null}
                      leaveCategory={req.leaveType.leaveCategory}
                      leaveTypeName={req.leaveType.name}
                      startDate={formatDate(req.leaveStartDateTime)}
                      endDate={formatDate(req.leaveEndDateTime)}
                      totalDays={req.totalDays % 1 === 0 ? String(req.totalDays) : req.totalDays.toFixed(1)}
                      status={req.status}
                      createdAt={formatDate(req.createdAt)}
                      reason={req.reason ?? null}
                      approverName={req.approvals[0]?.approver.name ?? null}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination page={currentPage} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} />
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
