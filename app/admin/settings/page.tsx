import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Link, redirect } from '@/i18n/navigation'
import AdminLayout from '@/components/admin-layout'

export default async function SettingsPage() {
  const session = await auth()

  if (!session || !session.user.isAdmin) redirect('/login')

  const currentYear = new Date().getFullYear()

  const [leaveTypeCount, positionCount, holidayCount, dbUser] = await Promise.all([
    prisma.leaveType.count(),
    prisma.position.count(),
    prisma.companyHoliday.count({ where: { year: currentYear } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="ตั้งค่าระบบ" user={user}>
      <div className="max-w-3xl mx-auto space-y-6">

        <div>
          <h1 className="text-lg font-semibold text-foreground">ตั้งค่าระบบ</h1>
          <p className="text-sm text-muted-foreground">จัดการข้อมูลหลักของระบบลา</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Holidays card */}
          <Link
            href="/admin/holiday-management"
            className="group rounded-xl border border-border bg-card shadow-sm p-6 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all duration-150"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl">
                ☀️
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                จัดการ →
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">วันหยุด</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                ปีนี้ <span className="font-medium text-foreground">{holidayCount}</span> วัน
              </p>
            </div>
          </Link>

          {/* Leave Types card */}
          <Link
            href="/admin/settings/leave-types"
            className="group rounded-xl border border-border bg-card shadow-sm p-6 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all duration-150"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl">
                📋
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                จัดการ →
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">ประเภทการลา</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                ทั้งหมด <span className="font-medium text-foreground">{leaveTypeCount}</span> ประเภท
              </p>
            </div>
          </Link>

          {/* Positions card */}
          <Link
            href="/admin/settings/positions"
            className="group rounded-xl border border-border bg-card shadow-sm p-6 flex flex-col gap-3 hover:border-primary/40 hover:shadow-md transition-all duration-150"
          >
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary text-2xl">
                🏷️
              </div>
              <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                จัดการ →
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">ตำแหน่งงาน</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                ทั้งหมด <span className="font-medium text-foreground">{positionCount}</span> ตำแหน่ง
              </p>
            </div>
          </Link>

        </div>
      </div>
    </AdminLayout>
  )
}
