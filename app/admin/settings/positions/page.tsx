import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { Link } from '@/i18n/navigation'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin-layout'

export default async function PositionsPage() {
  const session = await auth()

  if (!session || !session.user.isAdmin) redirect('/login')

  const [positionsRaw, departments, dbUser] = await Promise.all([
    prisma.position.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { employees: true } },
      },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const deptMap = new Map(departments.map((d) => [d.id, d.name]))

  const positions = positionsRaw
    .map((p) => ({ ...p, departmentName: p.departmentId ? (deptMap.get(p.departmentId) ?? null) : null }))
    .sort((a, b) => {
      const deptA = a.departmentName ?? '\uffff'
      const deptB = b.departmentName ?? '\uffff'
      if (deptA !== deptB) return deptA.localeCompare(deptB, 'th')
      return a.name.localeCompare(b.name, 'th')
    })

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
          <Link href="/admin/settings" className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
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
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">ชื่อตำแหน่ง</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">แผนก</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">จำนวนพนักงาน</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {positions.map((pos, idx) => (
                  <tr key={pos.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                    <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">{idx + 1}</td>
                    <td className="px-5 py-4 font-medium text-foreground whitespace-nowrap">{pos.name}</td>
                    <td className="px-5 py-4 text-center text-muted-foreground whitespace-nowrap">
                      {pos.departmentName ?? <span className="italic opacity-40">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                        {pos._count.employees}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/settings/positions/${pos.id}`}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        แก้ไข
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
