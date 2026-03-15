import { auth } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import NewLeaveTypeForm from './NewLeaveTypeForm'
import AdminLayout from '@/components/admin-layout'
import { prisma } from '@/lib/prisma'

export default async function NewLeaveTypePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const [dbUser, categories] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } }),
    prisma.leaveCategoryConfig.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, name: true } }),
  ])

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="เพิ่มประเภทการลา" user={user}>
      <div className="max-w-xl mx-auto space-y-5">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/settings" className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition">ตั้งค่าระบบ</Link>
          <span>/</span>
          <span className="text-foreground font-medium">เพิ่มประเภทการลาใหม่</span>
        </nav>
        <h2 className="text-lg font-semibold text-foreground">เพิ่มประเภทการลาใหม่</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm p-6">
          <NewLeaveTypeForm categories={categories} />
        </div>
      </div>
    </AdminLayout>
  )
}
