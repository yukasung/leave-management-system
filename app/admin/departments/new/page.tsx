import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'
import NewDepartmentForm from './NewDepartmentForm'

export default async function NewDepartmentPage() {
  const session = await auth()

  if (!session || !session.user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 font-semibold">Unauthorized</p>
      </div>
    )
  }

  const managers = await prisma.user.findMany({
    where: { role: { in: ['HR', 'ADMIN'] } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, role: true },
  })

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6 flex items-center gap-2">
        <Link href="/admin/departments" className="hover:text-indigo-600">จัดการแผนก</Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">เพิ่มแผนกใหม่</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">เพิ่มแผนกใหม่</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <NewDepartmentForm managers={managers} />
      </div>
    </div>
  )
}
