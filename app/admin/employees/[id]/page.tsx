import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { notFound } from 'next/navigation'
import EditEmployeeForm from './EditEmployeeForm'
import AdminLayout from '@/components/admin-layout'

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const { id } = await params

  const [employee, departments, managers, positions, dbUser] = await Promise.all([
    prisma.employee.findUnique({
      where: { id },
      select: {
        id:           true,
        employeeCode: true,
        firstName:    true,
        lastName:     true,
        email:        true,
        phone:        true,
        avatarUrl:    true,
        position:     true,
        positionId:   true,
        isAdmin:      true,
        isManager:    true,
        isProbation:  true,
        isActive:     true,
        departmentId: true,
        managerId:    true,
        createdAt:    true,
        department:   { select: { name: true } },
        approvers:    { select: { id: true } },
      },
    }),
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        manager: { select: { employee: { select: { id: true } } } },
      },
    }),
    prisma.employee.findMany({
      where: { isActive: true, isManager: true, isAdmin: false },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      select: { id: true, firstName: true, lastName: true, position: true, department: { select: { name: true } } },
    }),
    prisma.position.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, departmentId: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  if (!employee) notFound()

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="แก้ไขพนักงาน" user={user}>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin/employees" className="text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300 transition">
            จัดการพนักงาน
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">
            {employee.firstName} {employee.lastName}
          </span>
        </nav>

        <EditEmployeeForm
          employee={{
            id:           employee.id,
            employeeCode: employee.employeeCode,
            firstName:    employee.firstName,
            lastName:     employee.lastName,
            email:        employee.email,
            phone:        employee.phone,
            avatarUrl:    employee.avatarUrl,
            position:     employee.position,
            positionId:   employee.positionId,
            isAdmin:      employee.isAdmin,
            isManager:    employee.isManager,
            isProbation:  employee.isProbation,
            isActive:     employee.isActive,
            departmentId: employee.departmentId,
            managerId:    employee.managerId,
            approverIds:  employee.approvers.map(a => a.id),
          }}
          departments={departments}
          managers={managers}
          positions={positions}
        />
      </div>
    </AdminLayout>
  )
}
