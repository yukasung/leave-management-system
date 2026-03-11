import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileForm, { type ProfileData } from './ProfileForm'
import AdminLayout from '@/components/admin-layout'

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:        true,
      name:      true,
      email:     true,
      avatarUrl: true,
      phone:     true,
      department: { select: { name: true } },
      employee: {
        select: {
          firstName: true,
          lastName:  true,
          position:  true,
          isAdmin:   true,
        },
      },
    },
  })

  if (!user) redirect('/login')

  const data: ProfileData = {
    userId:     user.id,
    name:       user.name,
    email:      user.email,
    isAdmin:    user.employee?.isAdmin ?? false,
    avatarUrl:  user.avatarUrl ?? null,
    phone:      user.phone      ?? null,
    department: user.department?.name ?? null,
    firstName:  user.employee?.firstName ?? null,
    lastName:   user.employee?.lastName  ?? null,
    position:   user.employee?.position  ?? null,
  }

  const layoutUser = {
    name:      user.name ?? '',
    email:     user.email ?? '',
    avatarUrl: user.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
    isManager: session.user.isManager,
  }

  return (
    <AdminLayout title="โปรไฟล์" user={layoutUser}>
      <div className="max-w-3xl mx-auto space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">โปรไฟล์ของฉัน</h2>
          <p className="text-sm text-muted-foreground mt-0.5">จัดการข้อมูลส่วนตัวและรหัสผ่าน</p>
        </div>
        <ProfileForm data={data} />
      </div>
    </AdminLayout>
  )
}
