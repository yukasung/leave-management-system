import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import NewEmployeeForm from './NewEmployeeForm'
import AdminLayout from '@/components/admin-layout'

export default async function NewEmployeePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const [departments, managers, positions, dbUser] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        manager: { select: { employee: { select: { id: true } } } },
      },
    }),
    prisma.employee.findMany({
      where: { isActive: true, isManager: true },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, position: true },
    }),
    prisma.position.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
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
    <AdminLayout title="เพิ่มพนักงาน" user={user}>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/employees" className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition">
            จัดการพนักงาน
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">เพิ่มพนักงานใหม่</span>
        </nav>

        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">เพิ่มพนักงานใหม่</h2>
          <p className="text-sm text-muted-foreground mt-0.5">กรอกข้อมูลพนักงานให้ครบถ้วน ฟิลด์ที่มี * จำเป็นต้องกรอก</p>
        </div>

        <NewEmployeeForm departments={departments} managers={managers} positions={positions} />
      </div>
    </AdminLayout>
  )
}
