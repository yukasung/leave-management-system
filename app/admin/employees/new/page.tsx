import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import NewEmployeeForm from './NewEmployeeForm'

export default async function NewEmployeePage() {
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

  const [departments, managers, positions] = await Promise.all([
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

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/admin/employees" className="hover:text-gray-600 transition">
          จัดการพนักงาน
        </Link>
        <span>/</span>
        <span className="text-gray-600 font-medium">เพิ่มพนักงานใหม่</span>
      </nav>

      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-gray-800">เพิ่มพนักงานใหม่</h1>
        <p className="text-sm text-gray-500 mt-1">กรอกข้อมูลพนักงานให้ครบถ้วน ฟิลด์ที่มี * จำเป็นต้องกรอก</p>
      </div>

      <NewEmployeeForm departments={departments} managers={managers} positions={positions} />
    </div>
  )
}
