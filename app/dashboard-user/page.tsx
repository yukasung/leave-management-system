import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/format-date'
import AdminLayout from '@/components/admin-layout'
import {
  CalendarPlus,
  ClipboardList,
  BarChart2,
  Clock,
  ChevronRight,
  ArrowRight,
  User,
} from 'lucide-react'

const STATUS_BADGE: Record<string, string> = {
  DRAFT:            'bg-muted text-muted-foreground border-border',
  PENDING:          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  IN_REVIEW:        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
  APPROVED:         'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED:         'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  CANCELLED:        'bg-muted text-muted-foreground border-border',
  CANCEL_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT:            'ร่าง',
  PENDING:          'รออนุมัติ',
  IN_REVIEW:        'กำลังพิจารณา',
  APPROVED:         'อนุมัติแล้ว',
  REJECTED:         'ไม่อนุมัติ',
  CANCELLED:        'ยกเลิกแล้ว',
  CANCEL_REQUESTED: 'ขอยกเลิก (รอ HR)',
}

export default async function DashboardUserPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const yearCE = new Date().getFullYear()
  const year   = yearCE + 543

  const [balances, recentRequests, pendingCount, dbUser] = await Promise.all([
    prisma.leaveBalance.findMany({
      where: { userId: session.user.id, year: yearCE },
      orderBy: { leaveType: { name: 'asc' } },
      include: { leaveType: { select: { name: true } } },
    }),
    prisma.leaveRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { leaveType: { select: { name: true } } },
    }),
    prisma.leaveRequest.count({
      where: { userId: session.user.id, status: 'PENDING' },
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
    isManager: session.user.isManager,
  }

  const totalBalance = balances.reduce((s, b) => s + b.totalDays, 0)
  const usedBalance  = balances.reduce((s, b) => s + b.usedDays,  0)
  const remaining    = totalBalance - usedBalance

  return (
    <AdminLayout title="หน้าหลัก" user={user}>
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            สวัสดี, {session.user.name?.split(' ')[0] ?? 'คุณ'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            ยินดีต้อนรับสู่ระบบบริหารการลา — ปี {year}
          </p>
        </div>

        {/* Stat cards — clickable, link to leave-balance */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          <Link
            href="/leave-balance"
            className="group rounded-xl border border-border bg-card shadow-sm p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              สิทธิ์ทั้งหมด
            </p>
            <p className="text-3xl font-bold text-foreground">{Number.isInteger(totalBalance) ? totalBalance : parseFloat(totalBalance.toFixed(2))}</p>
            <p className="text-xs text-muted-foreground mt-1">วัน</p>
            <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              ดูสิทธิ์ทั้งหมด →
            </p>
          </Link>

          <Link
            href="/leave-balance"
            className="group rounded-xl border border-border bg-card shadow-sm p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              ใช้ไปแล้ว
            </p>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{Number.isInteger(usedBalance) ? usedBalance : parseFloat(usedBalance.toFixed(2))}</p>
            <p className="text-xs text-muted-foreground mt-1">วัน</p>
            <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              ดูสิทธิ์ทั้งหมด →
            </p>
          </Link>

          <Link
            href="/leave-balance"
            className="group rounded-xl border border-border bg-card shadow-sm p-5 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              คงเหลือ
            </p>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{Number.isInteger(remaining) ? remaining : parseFloat(remaining.toFixed(2))}</p>
            <p className="text-xs text-muted-foreground mt-1">วัน</p>
            <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              ดูสิทธิ์ทั้งหมด →
            </p>
          </Link>
        </div>

        {/* Quick action cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/leave-request"
            className="group flex flex-col items-start gap-3 rounded-xl border border-transparent bg-primary p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:bg-primary/90"
          >
            <div className="rounded-lg bg-primary-foreground/20 p-2">
              <CalendarPlus className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-foreground">ยื่นคำขอลา</p>
              <p className="text-xs text-primary-foreground/70 mt-0.5">สร้างคำขอใหม่</p>
            </div>
          </Link>

          <Link
            href="/my-leaves"
            className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50"
          >
            <div className="rounded-lg bg-muted p-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">ประวัติการลา</p>
              <p className="text-xs text-muted-foreground mt-0.5">ดูคำขอทั้งหมด</p>
            </div>
          </Link>

          <Link
            href="/leave-balance"
            className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50"
          >
            <div className="rounded-lg bg-muted p-2">
              <BarChart2 className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">สิทธิ์การลา</p>
              <p className="text-xs text-muted-foreground mt-0.5">ตรวจสอบวันลา</p>
            </div>
          </Link>

          {pendingCount > 0 ? (
            <Link
              href="/my-leaves"
              className="group flex flex-col items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-amber-400 dark:hover:border-amber-600"
            >
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/50 p-2">
                <Clock className="h-4 w-4 text-amber-700 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  รออนุมัติ {pendingCount} รายการ
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-0.5">คลิกเพื่อดูรายการ</p>
              </div>
            </Link>
          ) : (
            <Link
              href="/profile"
              className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50"
            >
              <div className="rounded-lg bg-muted p-2">
                <User className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-150" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">โปรไฟล์</p>
                <p className="text-xs text-muted-foreground mt-0.5">แก้ไขข้อมูลของฉัน</p>
              </div>
            </Link>
          )}
        </div>

        {/* Leave balance table */}
        {balances.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-foreground">สิทธิ์การลาคงเหลือ</h2>
              <Link
                href="/leave-balance"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline cursor-pointer transition-colors"
              >
                ดูทั้งหมด <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ประเภทการลา</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">สิทธิ์ทั้งหมด (วัน)</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ใช้ไปแล้ว (วัน)</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">คงเหลือ (วัน)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {balances.map((b) => {
                    const rem = b.totalDays - b.usedDays
                    const pct = b.totalDays > 0 ? (b.usedDays / b.totalDays) * 100 : 0
                    const remColor =
                      rem <= 0    ? 'text-red-600 dark:text-red-400'
                      : pct >= 75 ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                    return (
                      <tr key={b.id} className="hover:bg-muted/40 transition-colors duration-150">
                        <td className="px-5 py-3 font-medium text-foreground whitespace-nowrap">{b.leaveType.name}</td>
                        <td className="px-5 py-3 text-center text-muted-foreground whitespace-nowrap">{Number.isInteger(b.totalDays) ? b.totalDays : parseFloat(b.totalDays.toFixed(2))}</td>
                        <td className="px-5 py-3 text-center text-muted-foreground whitespace-nowrap">{Number.isInteger(b.usedDays) ? b.usedDays : parseFloat(b.usedDays.toFixed(2))}</td>
                        <td className={`px-5 py-3 text-center font-semibold whitespace-nowrap ${remColor}`}>{Number.isInteger(rem) ? rem : parseFloat(rem.toFixed(2))}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Recent requests */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground">คำขอลาล่าสุด</h2>
            <Link
              href="/my-leaves"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline cursor-pointer transition-colors"
            >
              ดูทั้งหมด <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentRequests.length === 0 ? (
            <div className="rounded-xl border border-border bg-card shadow-sm py-14 text-center">
              <p className="text-sm text-muted-foreground">ยังไม่มีคำขอลา</p>
              <Link
                href="/leave-request"
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-medium text-primary hover:underline cursor-pointer transition-colors"
              >
                <CalendarPlus className="h-3.5 w-3.5" />
                ยื่นคำขอลาแรกของคุณ
              </Link>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
              {recentRequests.map((r, idx) => (
                <Link
                  key={r.id}
                  href="/my-leaves"
                  className={`group flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors duration-150 hover:bg-muted/40 ${idx !== 0 ? 'border-t border-border' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.leaveType.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(r.leaveStartDateTime)}
                      {r.leaveStartDateTime.toDateString() !== r.leaveEndDateTime.toDateString() && (
                        <> — {formatDate(r.leaveEndDateTime)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs text-muted-foreground hidden sm:block">{Number.isInteger(r.totalDays) ? r.totalDays : parseFloat(r.totalDays.toFixed(2))} วัน</span>
                    <span className={`inline-block text-xs font-medium px-2.5 py-0.5 rounded-full border ${STATUS_BADGE[r.status] ?? STATUS_BADGE.DRAFT}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

      </div>
    </AdminLayout>
  )
}
