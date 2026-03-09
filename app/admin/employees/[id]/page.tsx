import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
        isProbation:  true,
        isActive:     true,
        departmentId: true,
        managerId:    true,
        createdAt:    true,
        department:   { select: { name: true } },
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
      where: { isActive: true },
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
          <Link href="/admin/employees" className="hover:text-foreground transition">
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
            isProbation:  employee.isProbation,
            isActive:     employee.isActive,
            departmentId: employee.departmentId,
            managerId:    employee.managerId,
          }}
          departments={departments}
          managers={managers}
          positions={positions}
        />
      </div>
    </AdminLayout>
  )
}
