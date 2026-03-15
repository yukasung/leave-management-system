import { prisma }      from '@/lib/prisma'
import { auth }        from '@/lib/auth'
import { redirect }    from 'next/navigation'
import { LeaveStatus } from '@prisma/client'
import AdminLayout     from '@/components/admin-layout'
import PendingLeaveFilters from './PendingLeaveFilters'
import { formatDate }  from '@/lib/format-date'
import Link            from 'next/link'
import { cn }          from '@/lib/utils'
import { AlertTriangle, CalendarClock } from 'lucide-react'
import { STATUS_BADGE, STATUS_LABEL as STATUS_LABEL_ALL } from '@/lib/leave-status'

const STATUS_LABELS: Record<string, string> = {
  PENDING:          STATUS_LABEL_ALL.PENDING,
  IN_REVIEW:        STATUS_LABEL_ALL.IN_REVIEW,
  CANCEL_REQUESTED: STATUS_LABEL_ALL.CANCEL_REQUESTED,
}

const STATUS_CLASSES = STATUS_BADGE

const PAGE_SIZE = 12

type SearchParams = {
  approverId?:   string
  departmentId?: string
  dateFrom?:     string
  dateTo?:       string
  dir?:          string
  page?:         string
}

export default async function PendingLeavePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user.isAdmin) redirect('/login')

  const dbUser = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { avatarUrl: true },
  })
  const user = {
    name:      session.user.name  ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl  ?? null,
    isAdmin:   true,
  }

  const { approverId, departmentId, dateFrom, dateTo, dir: dirParam, page: pageStr } = await searchParams
  const sortDir: 'asc' | 'desc' = dirParam === 'asc' ? 'asc' : 'desc'
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)

  const now = new Date()

  const PENDING_STATUSES: LeaveStatus[] = ['PENDING', 'IN_REVIEW', 'CANCEL_REQUESTED']

  const where = {
    status: { in: PENDING_STATUSES },
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom)                       } : {}),
            ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z')     } : {}),
          },
        }
      : {}),
    ...(departmentId ? { user: { departmentId } } : {}),
    ...(approverId
      ? { approvals: { some: { approverId, status: 'PENDING' as const } } }
      : {}),
  }

  const overdueThreshold = new Date(now.getTime() - 3 * 86_400_000)

  const [total, overdueTotal, requests, departments, approversRaw] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.count({ where: { ...where, createdAt: { lt: overdueThreshold } } }),
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: sortDir },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            name:       true,
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true } },
        approvals: {
          where:   { status: 'PENDING' },
          orderBy: { level: 'asc' },
          take:    1,
          include: { approver: { select: { id: true, name: true } } },
        },
      },
    }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.approval.findMany({
      where:    { status: 'PENDING' },
      select:   { approver: { select: { id: true, name: true } } },
      distinct: ['approverId'],
    }),
  ])

  const approvers = approversRaw.map((a) => a.approver)

  const rows = requests.map((r) => {
    const waitDays = Math.floor((now.getTime() - r.createdAt.getTime()) / 86_400_000)
    return {
      id:           r.id,
      employeeName: r.user.name,
      department:   r.user.department?.name ?? '-',
      leaveType:    r.leaveType.name,
      startDate:    r.leaveStartDateTime,
      endDate:      r.leaveEndDateTime,
      totalDays:    r.totalDays,
      createdAt:    r.createdAt,
      waitDays,
      isOverdue:    waitDays > 3,
      approverName: r.approvals[0]?.approver?.name ?? '-',
      status:       r.status as string,
    }
  })

  const overdue = overdueTotal
  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildLink(overrides: Record<string, string | undefined>) {
    const q = new URLSearchParams()
    if (approverId)   q.set('approverId',   approverId)
    if (departmentId) q.set('departmentId', departmentId)
    if (dateFrom)     q.set('dateFrom',     dateFrom)
    if (dateTo)       q.set('dateTo',       dateTo)
    q.set('dir',  overrides.dir  ?? dirParam  ?? 'desc')
    q.set('page', overrides.page ?? String(page))
    return `?${q.toString()}`
  }

  function buildSortLink(nextDir: 'asc' | 'desc') {
    return buildLink({ dir: nextDir, page: '1' })
  }

  function buildPageLink(p: number) {
    return buildLink({ page: String(p) })
  }

  const nextDir = sortDir === 'desc' ? 'asc' : 'desc'

  return (
    <AdminLayout title="คำขอรออนุมัติ" user={user}>
      <div className="space-y-6 max-w-350 mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-foreground">คำขอรออนุมัติ</h1>
            <p className="text-sm text-muted-foreground mt-0.5">คำขอลาที่อยู่ระหว่างรอการอนุมัติ</p>
          </div>
          {overdue > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30 px-3 py-2">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <span className="text-sm font-semibold text-red-700 dark:text-red-400">รอนานเกิน 3 วัน: {overdue} รายการ</span>
            </div>
          )}
        </div>

        {/* Filters */}
        <PendingLeaveFilters
          departments={departments}
          approvers={approvers}
          current={{ approverId, departmentId, dateFrom, dateTo, dir: dirParam }}
          total={total}
          overdue={overdue}
        />

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-8">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ชื่อพนักงาน</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">แผนก</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ประเภทการลา</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันที่เริ่ม</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันที่สิ้นสุด</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">จำนวน (วัน)</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">
                    <Link href={buildSortLink(nextDir)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                      วันที่ยื่น
                      <span className="text-xs">{sortDir === 'desc' ? '↓' : '↑'}</span>
                    </Link>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ผู้อนุมัติ</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">สถานะ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-8 w-8 opacity-30" />
                        <p className="text-sm">ไม่มีคำขอที่รออนุมัติ</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'transition-colors',
                        row.isOverdue
                          ? 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40'
                          : 'hover:bg-muted/40',
                      )}
                    >
                      <td className="px-4 py-3 text-muted-foreground text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium text-foreground">{row.employeeName}</span>
                        {row.isOverdue && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-red-100 dark:bg-red-900/40 px-1.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                            {row.waitDays}d
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{row.department}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{row.leaveType}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap text-muted-foreground">{formatDate(row.startDate)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap text-muted-foreground">{formatDate(row.endDate)}</td>
                      <td className="px-4 py-3 text-center font-semibold text-foreground whitespace-nowrap">{row.totalDays}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap text-muted-foreground text-xs">{formatDate(row.createdAt)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap text-muted-foreground text-xs">{row.approverName}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
                          STATUS_CLASSES[row.status] ?? 'bg-gray-100 text-gray-700 border-gray-200',
                        )}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                          {STATUS_LABELS[row.status] ?? row.status}
                        </span>
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 text-sm">
            <p className="text-muted-foreground">
              แสดง {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} จาก {total} รายการ
            </p>
            <div className="flex items-center gap-1">
              <Link
                href={buildPageLink(page - 1)}
                aria-disabled={page <= 1}
                className={cn(
                  'rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors',
                  page <= 1
                    ? 'pointer-events-none opacity-40'
                    : 'hover:bg-muted',
                )}
              >
                ← ก่อนหน้า
              </Link>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildPageLink(p)}
                  className={cn(
                    'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                    p === page
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-muted',
                  )}
                >
                  {p}
                </Link>
              ))}
              <Link
                href={buildPageLink(page + 1)}
                aria-disabled={page >= totalPages}
                className={cn(
                  'rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors',
                  page >= totalPages
                    ? 'pointer-events-none opacity-40'
                    : 'hover:bg-muted',
                )}
              >
                ถัดไป →
              </Link>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
