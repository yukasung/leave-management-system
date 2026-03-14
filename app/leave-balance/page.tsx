import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin-layout'

export default async function LeaveBalancePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const currentYear = new Date().getFullYear()

  const [balances, allQuotaLeaveTypes, specialLeaveTypes, usedSpecial, dbUser] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { userId: session.user.id },
      select: { leaveTypeId: true, totalDays: true, usedDays: true },
    }),
    // All leave types that have a yearly cap — shown regardless of whether the user has a balance record
    prisma.leaveType.findMany({
      where: { maxDaysPerYear: { not: null } },
      select: { id: true, name: true, maxDaysPerYear: true },
      orderBy: { name: 'asc' },
    }),
    // Special leave types have no yearly quota — fetched directly
    prisma.leaveType.findMany({
      where: { maxDaysPerYear: null },
      select: { id: true, name: true, maxDaysPerRequest: true },
      orderBy: { name: 'asc' },
    }),
    // Sum of approved days per special leave type this year
    prisma.leaveRequest.groupBy({
      by: ['leaveTypeId'],
      where: {
        userId: session.user.id,
        status: 'APPROVED',
        leaveStartDateTime: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31, 23, 59, 59),
        },
        leaveType: { maxDaysPerYear: null },
      },
      _sum: { totalDays: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  // Map leaveTypeId → balance record
  const balanceMap = new Map(balances.map((b) => [b.leaveTypeId, b]))

  // Merge all quota leave types with balance data (fallback to 0 if no record)
  const quotaItems = allQuotaLeaveTypes.map((lt) => {
    const b = balanceMap.get(lt.id)
    return {
      id:        lt.id,
      name:      lt.name,
      totalDays: b?.totalDays ?? lt.maxDaysPerYear ?? 0,
      usedDays:  b?.usedDays  ?? 0,
    }
  })

  // Map leaveTypeId → usedDays for special types
  const specialUsedMap = new Map(
    usedSpecial.map((r) => [r.leaveTypeId, r._sum.totalDays ?? 0])
  )

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
    isManager: session.user.isManager,
  }

  return (
    <AdminLayout title="ยอดวันลาคงเหลือ" user={user}>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">ยอดวันลาคงเหลือ</h2>
          <p className="text-sm text-muted-foreground mt-0.5">ปี {new Date().getFullYear() + 543}</p>
        </div>

        {quotaItems.length === 0 && specialLeaveTypes.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-sm py-20 text-center text-muted-foreground">
            ยังไม่มีข้อมูลวันลาสะสม
          </div>
        ) : (() => {
          return (
            <div className="space-y-6">
              {/* ── Section 1: Annual quota leave types ── */}
              {quotaItems.length > 0 && (
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ลาประจำปี</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ประเภทการลา</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันลาที่ได้รับ (วัน)</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ใช้ไปแล้ว (วัน)</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">คงเหลือ (วัน)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {quotaItems.map((item) => {
                        const remaining = item.totalDays - item.usedDays
                        const isLow   = remaining <= 2 && remaining > 0
                        const isEmpty = remaining <= 0
                        const fmt = (n: number) => parseFloat(n.toFixed(2))
                        return (
                          <tr key={item.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition">
                            <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap">
                              {item.name}
                            </td>
                            <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
                              {fmt(item.totalDays)}
                            </td>
                            <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
                              {fmt(item.usedDays)}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${
                                isEmpty
                                  ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50'
                                  : isLow
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50'
                                  : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                              }`}>
                                {fmt(remaining)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ── Section 2: Per-occasion leave types (no annual cap) ── */}
              {specialLeaveTypes.length > 0 && (
                <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-muted/40 border-b border-border">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ลาพิเศษ</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr>
                        <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ประเภทการลา</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">สิทธิ์สูงสุด/ครั้ง</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ใช้ไปแล้ว (วัน)</th>
                        <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">จำนวนครั้ง/ปี</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {specialLeaveTypes.map((lt) => {
                        const used = parseFloat((specialUsedMap.get(lt.id) ?? 0).toFixed(2))
                        return (
                          <tr key={lt.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition">
                            <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap">
                              {lt.name}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              {lt.maxDaysPerRequest != null ? (
                                <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold border bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50">
                                  สูงสุด {lt.maxDaysPerRequest} วัน
                                </span>
                              ) : (
                                <span className="text-muted-foreground">ไม่จำกัด</span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
                              {used}
                            </td>
                            <td className="px-5 py-4 text-center whitespace-nowrap">
                              <span className="text-muted-foreground text-sm">ไม่จำกัด</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()}
      </div>
    </AdminLayout>
  )
}