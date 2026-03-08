import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import HolidayImportClient from './HolidayImportClient'
import AdminLayout from '@/components/admin-layout'
import { prisma } from '@/lib/prisma'

export default async function HolidayManagementPage() {
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
    <AdminLayout title="จัดการวันหยุด" user={user}>
      <div className="max-w-4xl mx-auto space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">จัดการวันหยุดนักขัตฤกษ์</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            นำเข้าวันหยุดประจำปีของประเทศไทยจากฐานข้อมูลสาธารณะ
          </p>
        </div>
        <HolidayImportClient />
      </div>
    </AdminLayout>
  )
}
