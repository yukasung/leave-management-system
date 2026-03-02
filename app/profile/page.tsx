import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import ProfileForm, { type ProfileData } from './ProfileForm'

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
      role:      true,
      avatarUrl: true,
      phone:     true,
      department: { select: { name: true } },
      employee: {
        select: {
          firstName: true,
          lastName:  true,
          position:  true,
        },
      },
    },
  })

  if (!user) redirect('/login')

  const data: ProfileData = {
    userId:     user.id,
    name:       user.name,
    email:      user.email,
    role:       user.role,
    avatarUrl:  user.avatarUrl ?? null,
    phone:      user.phone      ?? null,
    department: user.department?.name ?? null,
    firstName:  user.employee?.firstName ?? null,
    lastName:   user.employee?.lastName  ?? null,
    position:   user.employee?.position  ?? null,
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">โปรไฟล์ของฉัน</h1>
        <p className="text-sm text-gray-500 mt-1">จัดการข้อมูลส่วนตัวและรหัสผ่าน</p>
      </div>
      <ProfileForm data={data} />
    </div>
  )
}
