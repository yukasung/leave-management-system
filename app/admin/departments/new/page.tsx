import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewDepartmentForm from './NewDepartmentForm'
import AdminLayout from '@/components/admin-layout'

export default async function NewDepartmentPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const [managers, dbUser] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ['HR', 'ADMIN'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, role: true },
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
    <AdminLayout title="เพิ่มแผนก" user={user}>
      <div className="max-w-xl mx-auto space-y-5">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/departments" className="hover:text-foreground transition">จัดการแผนก</Link>
          <span>/</span>
          <span className="text-foreground font-medium">เพิ่มแผนกใหม่</span>
        </nav>
        <h2 className="text-lg font-semibold text-foreground">เพิ่มแผนกใหม่</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm p-6">
          <NewDepartmentForm managers={managers} />
        </div>
      </div>
    </AdminLayout>
  )
}
