import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EditDepartmentForm from './EditDepartmentForm'

export default async function EditDepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 font-semibold">Unauthorized</p>
      </div>
    )
  }

  const { id } = await params

  const [department, managers] = await Promise.all([
    prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { employees: true } } },
    }),
    prisma.user.findMany({
      where: { role: { in: ['MANAGER', 'HR', 'EXECUTIVE', 'ADMIN'] } },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, role: true },
    }),
  ])

  if (!department) notFound()

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/admin/departments" className="hover:text-indigo-600">จัดการแผนก</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">{department.name}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">แก้ไขแผนก</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <EditDepartmentForm department={department} managers={managers} />
      </div>
    </div>
  )
}
