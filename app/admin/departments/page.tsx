import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminLayout from '@/components/admin-layout'

export default async function DepartmentsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const [departments, dbUser] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: {
        manager: { select: { name: true, email: true } },
        _count: { select: { employees: true } },
      },
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
    <AdminLayout title="จัดการแผนก" user={user}>
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">จัดการแผนก</h2>
            <p className="text-sm text-muted-foreground mt-0.5">ทั้งหมด {departments.length} แผนก</p>
          </div>
          <Link
            href="/admin/departments/new"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> เพิ่มแผนก
          </Link>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {departments.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-4xl mb-3">🏢</p>
              <p className="font-medium">ยังไม่มีแผนก</p>
              <p className="text-sm mt-1">เริ่มต้นโดยเพิ่มแผนกแรก</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ชื่อแผนก</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">ผู้จัดการ</th>
                  <th className="text-center px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">จำนวนพนักงาน</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {departments.map((dept, idx) => (
                  <tr key={dept.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                    <td className="px-5 py-4 text-muted-foreground/60">{idx + 1}</td>
                    <td className="px-5 py-4 font-medium text-foreground">{dept.name}</td>
                    <td className="px-5 py-4 text-muted-foreground">
                      {dept.manager ? (
                        <span>{dept.manager.name}</span>
                      ) : (
                        <span className="text-muted-foreground/40 italic">ไม่ระบุ</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground font-semibold text-xs">
                        {dept._count.employees}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/departments/${dept.id}`}
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
