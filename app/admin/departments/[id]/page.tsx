import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditDepartmentForm from './EditDepartmentForm'
import AdminLayout from '@/components/admin-layout'

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const { id } = await params

  const [department, dbUser] = await Promise.all([
    prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  if (!department) notFound()

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="แก้ไขแผนก" user={user}>
      <div className="max-w-xl mx-auto space-y-5">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/departments" className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition">จัดการแผนก</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{department.name}</span>
        </nav>
        <h2 className="text-lg font-semibold text-foreground">แก้ไขแผนก</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm p-6">
          <EditDepartmentForm department={department} />
        </div>
      </div>
    </AdminLayout>
  )
}
