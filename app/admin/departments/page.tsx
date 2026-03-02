import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'

export default async function DepartmentsPage() {
  const session = await auth()

  if (!session || session.user.role !== 'ADMIN') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl font-semibold">Unauthorized</p>
          <p className="text-gray-500 text-sm mt-1">เฉพาะผู้ดูแลระบบเท่านั้น</p>
        </div>
      </div>
    )
  }

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: {
      manager: { select: { name: true, email: true } },
      _count: { select: { employees: true } },
    },
  })

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">จัดการแผนก</h1>
          <p className="text-sm text-gray-500 mt-1">
            ทั้งหมด {departments.length} แผนก
          </p>
        </div>
        <Link
          href="/admin/departments/new"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <span className="text-lg leading-none">+</span> เพิ่มแผนก
        </Link>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {departments.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🏢</p>
            <p className="font-medium">ยังไม่มีแผนก</p>
            <p className="text-sm mt-1">เริ่มต้นโดยเพิ่มแผนกแรก</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">ชื่อแผนก</th>
                <th className="text-left px-5 py-3 font-semibold text-gray-600">ผู้จัดการ</th>
                <th className="text-center px-5 py-3 font-semibold text-gray-600">จำนวนพนักงาน</th>
                <th className="text-right px-5 py-3 font-semibold text-gray-600">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {departments.map((dept, idx) => (
                <tr key={dept.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-4 text-gray-400">{idx + 1}</td>
                  <td className="px-5 py-4 font-medium text-gray-900">{dept.name}</td>
                  <td className="px-5 py-4 text-gray-600">
                    {dept.manager ? (
                      <span>{dept.manager.name}</span>
                    ) : (
                      <span className="text-gray-400 italic">ไม่ระบุ</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-sm">
                      {dept._count.employees}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/departments/${dept.id}`}
                      className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      แก้ไข →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
