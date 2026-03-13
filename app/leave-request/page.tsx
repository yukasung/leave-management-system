import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LeaveRequestForm from './LeaveRequestForm'
import { getUsedLeaveDaysThisYear } from '@/lib/leave-policy'
import AdminLayout from '@/components/admin-layout'
import { formatDate } from '@/lib/format-date'
import LeaveTableRow from '@/app/my-leaves/LeaveTableRow'

const STATUS_BADGE: Record<string, string> = {
  PENDING:          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  IN_REVIEW:        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
  APPROVED:         'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED:         'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  CANCELLED:        'bg-muted text-muted-foreground border-border',
  CANCEL_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
}

const STATUS_LABEL: Record<string, string> = {
  PENDING:          'รออนุมัติ',
  IN_REVIEW:        'กำลังพิจารณา',
  APPROVED:         'อนุมัติแล้ว',
  REJECTED:         'ไม่อนุมัติ',
  CANCELLED:        'ยกเลิกแล้ว',
  CANCEL_REQUESTED: 'ขอยกเลิก (รอ HR)',
}

const PAGE_SIZE = 14

export default async function LeaveRequestPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const { page: pageStr } = (await searchParams) ?? {}
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)

  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const year = new Date().getFullYear()

  const [leaveTypes, balances, dbUser, total, requests] = await Promise.all([
    prisma.leaveType.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        maxDaysPerYear: true,
        maxDaysPerRequest: true,
        requiresAttachment: true,
        deductFromBalance: true,
        allowDuringProbation: true,
      },
    }),
    prisma.leaveBalance.findMany({
      where: { userId: session.user.id, year },
      select: { leaveTypeId: true, totalDays: true, usedDays: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
    prisma.leaveRequest.count({
      where: {
        userId: session.user.id,
        status: { not: 'DRAFT' },
        leaveStartDateTime: {
          gte: new Date(`${year}-01-01T00:00:00`),
          lt:  new Date(`${year + 1}-01-01T00:00:00`),
        },
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        userId: session.user.id,
        status: { not: 'DRAFT' },
        leaveStartDateTime: {
          gte: new Date(`${year}-01-01T00:00:00`),
          lt:  new Date(`${year + 1}-01-01T00:00:00`),
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { leaveType: { select: { name: true } } },
    }),
  ])

  // Yearly usage for types that DON’T deduct from balance (so we can still show quota)
  const nonBalanceTypes = leaveTypes.filter(
    (lt) => !lt.deductFromBalance && lt.maxDaysPerYear !== null
  )
  const usageEntries = await Promise.all(
    nonBalanceTypes.map(async (lt) => {
      const used = await getUsedLeaveDaysThisYear(session.user.id, lt.id)
      return [lt.id, used] as const
    })
  )
  const usageByType: Record<string, number> = Object.fromEntries(usageEntries)

  const balanceByType: Record<string, { totalDays: number; usedDays: number }> =
    Object.fromEntries(balances.map((b) => [b.leaveTypeId, b]))

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
    isManager: session.user.isManager,
  }

  return (
    <AdminLayout title="ยื่นคำขอลา" user={user}>
      <div className="flex flex-col xl:flex-row gap-8 items-start">
        {/* Form — fixed width on large screens */}
        <div className="w-full xl:w-105 shrink-0">
          <LeaveRequestForm
            leaveTypes={leaveTypes}
            balanceByType={balanceByType}
            usageByType={usageByType}
          />
        </div>

        {/* Leave history list — fills remaining space */}
        <div className="w-full min-w-0 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">ประวัติการลาของฉัน</h2>
            <p className="text-sm text-muted-foreground mt-0.5">ปี {year + 543} · ทั้งหมด {total} รายการ</p>
          </div>

          {total === 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-sm py-16 text-center text-muted-foreground">
              ยังไม่มีประวัติการลา
            </div>
          ) : (
            <>
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
                        const label    = STATUS_LABEL[req.status]  ?? req.status
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

              {/* Pagination */}
              {(() => {
                const totalPages = Math.ceil(total / PAGE_SIZE)
                if (totalPages <= 1) return null
                const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
                return (
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-xs text-muted-foreground">
                      หน้า {page} จาก {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                      <Link
                        href={`?page=${page - 1}`}
                        aria-disabled={page <= 1}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                          ${page <= 1
                            ? 'pointer-events-none opacity-40 border-border bg-background text-muted-foreground'
                            : 'border-border bg-background hover:bg-muted text-foreground'}`}
                      >
                        ← ก่อนหน้า
                      </Link>
                      {pages.map((p) => (
                        <Link
                          key={p}
                          href={`?page=${p}`}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium border transition
                            ${p === page
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border bg-background hover:bg-muted text-foreground'}`}
                        >
                          {p}
                        </Link>
                      ))}
                      <Link
                        href={`?page=${page + 1}`}
                        aria-disabled={page >= totalPages}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition
                          ${page >= totalPages
                            ? 'pointer-events-none opacity-40 border-border bg-background text-muted-foreground'
                            : 'border-border bg-background hover:bg-muted text-foreground'}`}
                      >
                        ถัดไป →
                      </Link>
                    </div>
                  </div>
                )
              })()}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
