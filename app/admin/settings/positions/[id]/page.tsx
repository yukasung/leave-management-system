import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import EditPositionForm from './EditPositionForm'
import AdminLayout from '@/components/admin-layout'

export default async function EditPositionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const { id } = await params
  const [position, dbUser, departments] = await Promise.all([
    prisma.position.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])
  if (!position) notFound()

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="แก้ไขตำแหน่ง" user={user}>
      <div className="max-w-xl mx-auto space-y-5">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/settings" className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition">ตั้งค่าระบบ</Link>
          <span>/</span>
          <span className="text-foreground font-medium">{position.name}</span>
        </nav>
        <h2 className="text-lg font-semibold text-foreground">แก้ไขตำแหน่งงาน</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm p-6">
          <EditPositionForm position={position} departments={departments} />
        </div>
      </div>
    </AdminLayout>
  )
}
