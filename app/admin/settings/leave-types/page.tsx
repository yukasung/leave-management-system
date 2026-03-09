import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import AdminLayout from '@/components/admin-layout'

export default async function LeaveTypesPage() {
  const session = await auth()

  if (!session || !session.user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl font-semibold">ไม่มีสิทธิ์เข้าถึง</p>
          <p className="text-muted-foreground text-sm mt-1">เฉพาะผู้ดูแลระบบเท่านั้น</p>
        </div>
      </div>
    )
  }

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
          <Link href="/admin/settings" className="hover:text-foreground transition-colors">
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
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ชื่อ</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันสูงสุด/ปี</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันสูงสุด/ครั้ง</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ต้องแนบเอกสาร</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">หักยอด</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ลาช่วงทดลองงาน</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">คำขอ</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {leaveTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                    <td className="px-5 py-4 font-medium text-foreground">{lt.name}</td>
                    <td className="px-5 py-4 text-center text-muted-foreground">
                      {lt.maxDaysPerYear ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center text-muted-foreground">
                      {lt.maxDaysPerRequest ?? <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BoolBadge value={lt.requiresAttachment} yes="ต้องการ" no="ไม่ต้องการ" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BoolBadge value={lt.deductFromBalance} yes="หัก" no="ไม่หัก" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BoolBadge value={lt.allowDuringProbation} yes="อนุญาต" no="ไม่อนุญาต" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground font-semibold text-xs">
                        {lt._count.leaveRequests}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/settings/leave-types/${lt.id}`}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        แก้ไข →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}

function BoolBadge({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return value ? (
    <span className="inline-block bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 text-xs font-medium px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
      {yes}
    </span>
  ) : (
    <span className="inline-block bg-muted text-muted-foreground text-xs font-medium px-2 py-0.5 rounded-full border border-border">
      {no}
    </span>
  )
}
