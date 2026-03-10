import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Link } from '@/i18n/navigation'
import AdminLayout from '@/components/admin-layout'

export default async function PositionsPage() {
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

  const [positions, dbUser] = await Promise.all([
    prisma.position.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
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
    <AdminLayout title="ตำแหน่งงาน" user={user}>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/settings" className="hover:text-foreground transition-colors">
            ตั้งค่าระบบ
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">ตำแหน่งงาน</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">ตำแหน่งงาน</h1>
            <p className="text-sm text-muted-foreground">ทั้งหมด {positions.length} ตำแหน่ง</p>
          </div>
          <Link
            href="/admin/settings/positions/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <span className="text-base leading-none">+</span> เพิ่มตำแหน่ง
          </Link>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {positions.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-4xl mb-3">🏷️</p>
              <p className="font-medium">ยังไม่มีตำแหน่งงาน</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ชื่อตำแหน่ง</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">จำนวนพนักงาน</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {positions.map((pos, idx) => (
                  <tr key={pos.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                    <td className="px-5 py-4 text-muted-foreground">{idx + 1}</td>
                    <td className="px-5 py-4 font-medium text-foreground">{pos.name}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {pos._count.employees}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/settings/positions/${pos.id}`}
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
