import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import LeaveRequestForm from './LeaveRequestForm'
import { getUsedLeaveDaysThisYear } from '@/lib/leave-policy'
import AdminLayout from '@/components/admin-layout'
import { formatDate } from '@/lib/format-date'
import LeaveTableRow from '@/app/my-leaves/LeaveTableRow'
import { STATUS_BADGE, STATUS_LABEL as STATUS_LABEL_MAP } from '@/lib/leave-status'

const STATUS_LABEL: Record<string, string> = STATUS_LABEL_MAP

const PAGE_SIZE = 14

export default async function LeaveRequestPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const year = new Date().getFullYear()

  const [leaveTypes, balances, dbUser, requests] = await Promise.all([
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
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">ประวัติการลาของฉัน</h2>
              <p className="text-sm text-muted-foreground mt-0.5">ปี {year + 543} · ทั้งหมด {requests.length} รายการ</p>
            </div>
            <Link
              href="/my-leaves"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline shrink-0"
            >
              ดูทั้งหมด →
            </Link>
          </div>

          {requests.length === 0 ? (
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
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">สถานะ</th>
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
                            hideCreatedAt
                            hideTotalDays
                          />
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
