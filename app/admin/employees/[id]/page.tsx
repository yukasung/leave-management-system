import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditEmployeeForm from './EditEmployeeForm'
import { formatThaiDate } from '@/lib/date-utils'

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session || !session.user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl font-semibold">Unauthorized</p>
          <p className="text-gray-500 text-sm mt-1">เฉพาะผู้ดูแลระบบเท่านั้น</p>
        </div>
      </div>
    )
  }

  const { id } = await params

  const [employee, departments, managers, positions] = await Promise.all([
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
  ])

  if (!employee) notFound()

  const createdDate = formatThaiDate(employee.createdAt)

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/admin/employees" className="hover:text-gray-600 transition">
          จัดการพนักงาน
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">
          {employee.firstName} {employee.lastName}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {employee.firstName} {employee.lastName}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {employee.employeeCode} · เพิ่มเมื่อ {createdDate}
          </p>
        </div>
        <span
          className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
            employee.isActive
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-500'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              employee.isActive ? 'bg-green-500' : 'bg-red-400'
            }`}
          />
          {employee.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

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
          role:         employee.role,
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
  )
}
