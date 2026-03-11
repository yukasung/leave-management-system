import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { LeaveStatus } from '@prisma/client'
import Link from 'next/link'
import AdminLayout from '@/components/admin-layout'
import LeaveHistoryFilters from './LeaveHistoryFilters'
import { formatDate } from '@/lib/format-date'
import { formatLeaveDuration } from '@/lib/leave-calc'
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

const STATUS_LABELS: Record<string, string> = {
  DRAFT:            'ร่าง',
  PENDING:          'รออนุมัติ',
  IN_REVIEW:        'รอ HR',
  APPROVED:         'อนุมัติแล้ว',
  REJECTED:         'ปฏิเสธ',
  CANCELLED:        'ยกเลิกแล้ว',
  CANCEL_REQUESTED: 'ขอยกเลิก',
}

const STATUS_BADGE: Record<string, string> = {
  PENDING:          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  IN_REVIEW:        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
  APPROVED:         'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED:         'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  CANCELLED:        'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
  CANCEL_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
  DRAFT:            'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
}

const STATUS_DOT: Record<string, string> = {
  PENDING:          'bg-amber-500',
  IN_REVIEW:        'bg-blue-500',
  APPROVED:         'bg-emerald-500',
  REJECTED:         'bg-red-500',
  CANCELLED:        'bg-gray-400',
  CANCEL_REQUESTED: 'bg-orange-500',
  DRAFT:            'bg-gray-400',
}

const VALID_SORTS = ['name', 'department', 'leaveType', 'startDate', 'endDate', 'totalDays', 'status', 'createdAt'] as const
type SortKey = typeof VALID_SORTS[number]

type SearchParams = {
  employee?:     string
  dateFrom?:     string
  dateTo?:       string
  leaveTypeId?:  string
  status?:       string
  departmentId?: string
  sort?:         string
  dir?:          string
  page?:         string
}

export default async function LeaveHistoryPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-lg font-semibold">ไม่มีสิทธิ์เข้าถึง</p>
      </div>
    )
  }

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
    employee, dateFrom, dateTo, leaveTypeId,
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
        leaveType: { select: { name: true } },
        approvals: {
          orderBy: { level: 'desc' },
          take: 1,
          include: { approver: { select: { name: true } } },
        },
      },
    }),
    prisma.leaveRequest.count({ where }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.leaveType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── URL helpers ─────────────────────────────────────────────────────────────
  function buildQS(overrides: Record<string, string | undefined> = {}) {
    const merged = {
      employee:     employee     || undefined,
      dateFrom:     dateFrom     || undefined,
      dateTo:       dateTo       || undefined,
      leaveTypeId:  leaveTypeId  || undefined,
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

  function pageUrl(p: number) {
    return `/hr/leave-history?${buildQS({ page: p > 1 ? String(p) : undefined })}`
  }

  // ── Sort header helper ───────────────────────────────────────────────────────
  type ColDef = { col: SortKey; label: string; className?: string; center?: boolean }
  const COLUMNS: ColDef[] = [
    { col: 'name',       label: 'ชื่อพนักงาน',    className: 'min-w-35' },
    { col: 'department', label: 'แผนก',            className: 'min-w-28', center: true },
    { col: 'leaveType',  label: 'ประเภทการลา',     className: 'min-w-30', center: true },
    { col: 'startDate',  label: 'วันที่เริ่ม',      className: 'min-w-25', center: true },
    { col: 'endDate',    label: 'วันที่สิ้นสุด',    className: 'min-w-25', center: true },
    { col: 'totalDays',  label: 'จำนวนวัน',         className: 'min-w-20', center: true },
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
          current={{ employee, dateFrom, dateTo, leaveTypeId, status: statusParam, departmentId, sort: sortKey, dir: sortDir }}
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
                    <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-35">
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
                    <tr key={req.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                      <td className="px-3 py-3 text-muted-foreground text-xs whitespace-nowrap">{skip + index + 1}</td>
                      <td className="px-3 py-3 text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {req.user.employee?.employeeCode ?? (
                          <span className="italic opacity-40">—</span>
                        )}
                      </td>
                      {/* Name */}
                      <td className="px-3 py-3 font-medium text-foreground whitespace-nowrap">{req.user.name}</td>
                      {/* Department */}
                      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">
                        {req.user.department?.name ?? <span className="italic opacity-40">—</span>}
                      </td>
                      {/* Leave type */}
                      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">{req.leaveType.name}</td>
                      {/* Start */}
                      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">{formatDate(req.leaveStartDateTime)}</td>
                      {/* End */}
                      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap">{formatDate(req.leaveEndDateTime)}</td>
                      {/* Days */}
                      <td className="px-3 py-3 text-center font-semibold text-foreground whitespace-nowrap">
                        {formatLeaveDuration(req.totalDays)}
                      </td>
                      {/* Status */}
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
                          STATUS_BADGE[req.status] ?? 'bg-gray-100 text-gray-600 border-gray-200',
                        )}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[req.status] ?? 'bg-gray-400')} />
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </td>
                      {/* Created at */}
                      <td className="px-3 py-3 text-center text-muted-foreground whitespace-nowrap text-xs">
                        {formatDate(req.createdAt)}
                      </td>
                      {/* Reason */}
                      <td className="px-3 py-3 text-muted-foreground max-w-50">
                        {req.reason ? (
                          <span className="line-clamp-2 text-xs" title={req.reason}>{req.reason}</span>
                        ) : (
                          <span className="italic opacity-40 text-xs">—</span>
                        )}
                      </td>
                      {/* Approver */}
                      <td className="px-3 py-3 text-center text-muted-foreground">
                        {req.approvals[0]?.approver.name ?? (
                          <span className="italic opacity-40 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  หน้า {currentPage} จาก {totalPages} ({total.toLocaleString()} รายการ)
                </p>
                <div className="flex items-center gap-1">
                  {currentPage > 1 ? (
                    <Link
                      href={pageUrl(currentPage - 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground/30">
                      <ChevronLeft className="h-4 w-4" />
                    </span>
                  )}

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let p: number
                    if (totalPages <= 5) {
                      p = i + 1
                    } else if (currentPage <= 3) {
                      p = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      p = totalPages - 4 + i
                    } else {
                      p = currentPage - 2 + i
                    }
                    return (
                      <Link
                        key={p}
                        href={pageUrl(p)}
                        className={cn(
                          'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-colors',
                          p === currentPage
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        {p}
                      </Link>
                    )
                  })}

                  {currentPage < totalPages ? (
                    <Link
                      href={pageUrl(currentPage + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground/30">
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
