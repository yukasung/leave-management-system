import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Link } from '@/i18n/navigation'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin-layout'
import LeaveTypeRow from './LeaveTypeRow'

export default async function LeaveTypesPage() {
  const session = await auth()

  if (!session || !session.user.isAdmin) redirect('/login')

  const [leaveTypes, dbUser] = await Promise.all([
    prisma.leaveType.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { leaveRequests: true } } },
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
    isAdmin:   true,
  }

  return (
    <AdminLayout title="ประเภทการลา" user={user}>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/settings" className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
            ตั้งค่าระบบ
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">ประเภทการลา</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">ประเภทการลา</h1>
            <p className="text-sm text-muted-foreground">ทั้งหมด {leaveTypes.length} ประเภท</p>
          </div>
          <Link
            href="/admin/settings/leave-types/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <span className="text-base leading-none">+</span> เพิ่มประเภทการลา
          </Link>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {leaveTypes.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">ยังไม่มีประเภทการลา</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ชื่อ</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันสูงสุด/ปี</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">วันสูงสุด/ครั้ง</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ต้องแนบเอกสาร</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">หักยอด</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ลาช่วงทดลองงาน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leaveTypes.map((lt) => (
                    <LeaveTypeRow
                      key={lt.id}
                      id={lt.id}
                      name={lt.name}
                      maxDaysPerYear={lt.maxDaysPerYear}
                      maxDaysPerRequest={lt.maxDaysPerRequest}
                      requiresAttachment={lt.requiresAttachment}
                      deductFromBalance={lt.deductFromBalance}
                      allowDuringProbation={lt.allowDuringProbation}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
