import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin-layout'
import { DashboardCards } from '@/components/dashboard-cards'
import { LeaveTable, type LeaveRow } from '@/components/leave-table'
import { buttonVariants } from '@/lib/button-variants'
import { formatThaiDateShort } from '@/lib/date-utils'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard-user')

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday   = new Date(startOfToday.getTime() + 86_400_000)

  const [
    totalEmployees,
    pendingApprovals,
    todayRequests,
    approvedThisMonth,
    recentRequests,
    leavesByStatus,
    dbUser,
  ] = await Promise.all([
    prisma.employee.count({ where: { isActive: true } }),
    prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
    prisma.leaveRequest.count({
      where: { createdAt: { gte: startOfToday, lt: endOfToday } },
    }),
    prisma.leaveRequest.count({
      where: { status: 'APPROVED', createdAt: { gte: startOfMonth } },
    }),
    prisma.leaveRequest.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, avatarUrl: true } },
        leaveType: { select: { name: true } },
      },
    }),
    prisma.leaveRequest.groupBy({
      by: ['status'],
      _count: { status: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const rows: LeaveRow[] = recentRequests.map((r) => ({
    id:         r.id,
    employee:   { name: r.user.name, avatarUrl: r.user.avatarUrl },
    leaveType:  r.leaveType.name,
    leaveStartDateTime: r.leaveStartDateTime,
    leaveEndDateTime:   r.leaveEndDateTime,
    totalDays:  r.totalDays,
    status:     r.status,
  }))

  const statusMap = Object.fromEntries(
    leavesByStatus.map((s) => [s.status, s._count.status]),
  )

  const user = {
    name:     session.user.name ?? '',
    email:    session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:  true,
  }

  return (
    <AdminLayout title="แดชบอร์ด" user={user}>
      <div className="space-y-6 max-w-7xl mx-auto">

        {/* Welcome */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            ยินดีต้อนรับ, {session.user.name} 👋
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {new Date().toLocaleDateString('th-TH', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>

        {/* Stat cards */}
        <DashboardCards
          totalEmployees={totalEmployees}
          pendingApprovals={pendingApprovals}
          todayRequests={todayRequests}
          approvedThisMonth={approvedThisMonth}
        />

        {/* Charts + Leave breakdown */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Leave status breakdown */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-foreground mb-4">
              คำขอลาตามสถานะ
            </h3>
            <div className="space-y-3">
              {[
                { key: 'PENDING',   label: 'รออนุมัติ',       color: 'bg-amber-400'  },
                { key: 'APPROVED',  label: 'อนุมัติแล้ว',     color: 'bg-emerald-400'},
                { key: 'REJECTED',  label: 'ไม่อนุมัติ',      color: 'bg-red-400'    },
                { key: 'IN_REVIEW', label: 'กำลังพิจารณา',    color: 'bg-blue-400'   },
                { key: 'CANCELLED', label: 'ยกเลิกแล้ว',      color: 'bg-gray-300'   },
              ].map(({ key, label, color }) => {
                const count = statusMap[key] ?? 0
                const total = Object.values(statusMap).reduce((a, b) => a + b, 0) || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{label}</span>
                      <span className="text-xs font-medium text-foreground">{count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Quick actions */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground mb-4">การดำเนินการด่วน</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[
                { href: '/hr/leave-requests',    label: 'คำขอลาทั้งหมด',        icon: '📋' },
                { href: '/employees',         label: 'จัดการพนักงาน',        icon: '👥' },
                { href: '/leave-types',       label: 'ประเภทการลา',          icon: '🏷️' },
                { href: '/admin/employees/new', label: 'เพิ่มพนักงาน',       icon: '➕' },
                { href: '/hr/audit-logs',     label: 'บันทึกการดำเนินการ',   icon: '📜' },
                { href: '/admin/settings',    label: 'ตั้งค่าระบบ',          icon: '⚙️' },
              ].map(({ href, label, icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 text-center text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <span className="text-xl">{icon}</span>
                  <span className="text-xs text-muted-foreground leading-snug">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent leave requests */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">คำขอลาล่าสุด</h3>
            <Link href="/hr/leave-requests" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              ดูทั้งหมด
            </Link>
          </div>
          <LeaveTable rows={rows} />
        </div>

      </div>
    </AdminLayout>
  )
}


