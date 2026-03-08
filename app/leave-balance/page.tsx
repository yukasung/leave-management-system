import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin-layout'

export default async function LeaveBalancePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [balances, dbUser] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { userId: session.user.id },
      orderBy: { leaveType: { name: 'asc' } },
      include: { leaveType: { select: { name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
  }

  return (
    <AdminLayout title="ยอดวันลาคงเหลือ" user={user}>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">ยอดวันลาคงเหลือ</h2>
          <p className="text-sm text-muted-foreground mt-0.5">ปี {new Date().getFullYear()}</p>
        </div>

        {balances.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-sm py-20 text-center text-muted-foreground">
            ยังไม่มีข้อมูลวันลาสะสม
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ประเภทการลา</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันลาที่ได้รับ</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">ใช้ไปแล้ว</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">คงเหลือ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {balances.map((balance) => {
                  const remaining = balance.totalDays - balance.usedDays
                  const isLow   = remaining <= 2 && remaining > 0
                  const isEmpty = remaining <= 0

                  return (
                    <tr key={balance.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition">
                      <td className="px-5 py-4 font-medium text-foreground">
                        {balance.leaveType.name}
                      </td>
                      <td className="px-5 py-4 text-center text-muted-foreground">
                        {balance.totalDays} วัน
                      </td>
                      <td className="px-5 py-4 text-center text-muted-foreground">
                        {balance.usedDays} วัน
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-sm font-semibold border ${
                            isEmpty
                              ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                          }`}
                        >
                          {remaining} วัน
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}