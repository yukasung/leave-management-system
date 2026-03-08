import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import NewPositionForm from './NewPositionForm'
import AdminLayout from '@/components/admin-layout'
import { prisma } from '@/lib/prisma'

export default async function NewPositionPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  })

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="เพิ่มตำแหน่ง" user={user}>
      <div className="max-w-xl mx-auto space-y-5">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/settings" className="hover:text-foreground transition">ตั้งค่าระบบ</Link>
          <span>/</span>
          <span className="text-foreground font-medium">เพิ่มตำแหน่งใหม่</span>
        </nav>
        <h2 className="text-lg font-semibold text-foreground">เพิ่มตำแหน่งงานใหม่</h2>
        <div className="rounded-xl border border-border bg-card shadow-sm p-6">
          <NewPositionForm />
        </div>
      </div>
    </AdminLayout>
  )
}
