import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/format-date'
import LeaveTableRow from './LeaveTableRow'
import AdminLayout from '@/components/admin-layout'
import Link from 'next/link'
import { STATUS_BADGE, STATUS_LABEL as STATUS_LABEL_MAP } from '@/lib/leave-status'

const PAGE_SIZE = 14

const STATUS_LABEL: Record<string, string> = STATUS_LABEL_MAP

export default async function MyLeaveHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; year?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { page: pageStr, year: yearStr } = (await searchParams) ?? {}
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)
  const currentYear = new Date().getFullYear()
  const year = parseInt(yearStr ?? String(currentYear), 10) || currentYear

  // Fetch all distinct years that have data for this user
  const allDates = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id, status: { not: 'DRAFT' } },
    select: { leaveStartDateTime: true },
  })
  const availableYears = [...new Set(allDates.map((r) => r.leaveStartDateTime.getFullYear()))].sort((a, b) => b - a)

  // If no data yet, fall back to current year only
  const resolvedYear = availableYears.includes(year)
    ? year
    : (availableYears[0] ?? currentYear)

  const yearStart = new Date(resolvedYear, 0, 1)
  const yearEnd   = new Date(resolvedYear + 1, 0, 1)
  const where = {
    userId: session.user.id,
    status: { not: 'DRAFT' as const },
    leaveStartDateTime: { gte: yearStart, lt: yearEnd },
  }

  const [total, requests, dbUser] = await Promise.all([
    prisma.leaveRequest.count({ where }),
    prisma.leaveRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { leaveType: { select: { name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
    isManager: session.user.isManager,
  }

  return (
    <AdminLayout title="การลาของฉัน" user={user}>
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-foreground">ประวัติการลาของฉัน</h2>
            <p className="text-sm text-muted-foreground mt-0.5">ปี {resolvedYear + 543} · ทั้งหมด {total} รายการ</p>
          </div>
          {/* Year selector */}
          {availableYears.length > 0 && (
          <div className="flex items-center gap-2">
            {availableYears.map((y) => (
              <Link
                key={y}
                href={`?year=${y}&page=1`}
                className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                  y === resolvedYear
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                {y + 543}
              </Link>
            ))}
          </div>
          )}
        </div>

        {requests.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-sm py-20 text-center text-muted-foreground">
            ยังไม่มีประวัติการลา
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ประเภทการลา</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันที่เริ่มลา</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันที่สิ้นสุด</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">จำนวน (วัน)</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">สถานะ</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันที่ขอ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req) => {
                    const badgeCls = STATUS_BADGE[req.status] ?? STATUS_BADGE.CANCELLED
                    const label   = STATUS_LABEL[req.status] ?? req.status
                    return (
                      <LeaveTableRow
                        key={req.id}
                        id={req.id}
                        leaveTypeName={req.leaveType.name}
                        startDate={formatDate(req.leaveStartDateTime)}
                        endDate={formatDate(req.leaveEndDateTime)}
                        totalDays={String(parseFloat(Number(req.totalDays).toFixed(2)))}
                        statusBadge={badgeCls}
                        statusLabel={label}
                        status={req.status}
                        createdAt={formatDate(req.createdAt)}
                      />
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-2">
            <Link
              href={`?year=${resolvedYear}&page=${page - 1}`}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                page <= 1
                  ? 'pointer-events-none opacity-40 border-border text-muted-foreground'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              ← ก่อนหน้า
            </Link>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`?year=${resolvedYear}&page=${p}`}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm border transition ${
                  p === page
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                {p}
              </Link>
            ))}

            <Link
              href={`?year=${resolvedYear}&page=${page + 1}`}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                page >= totalPages
                  ? 'pointer-events-none opacity-40 border-border text-muted-foreground'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              ถัดไป →
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}