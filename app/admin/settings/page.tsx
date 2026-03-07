import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import Link from 'next/link'

export default async function SettingsPage() {
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

  const [leaveTypes, positions] = await Promise.all([
    prisma.leaveType.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { leaveRequests: true } } },
    }),
    prisma.position.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    }),
  ])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      <h1 className="text-2xl font-bold text-gray-900">ตั้งค่าระบบ</h1>

      {/* Leave Types Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">ประเภทการลา</h2>
            <p className="text-sm text-gray-500">ทั้งหมด {leaveTypes.length} ประเภท</p>
          </div>
          <Link
            href="/admin/settings/leave-types/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> เพิ่มประเภทการลา
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {leaveTypes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">ยังไม่มีประเภทการลา</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">ชื่อ</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">วันสูงสุด/ปี</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">วันสูงสุด/ครั้ง</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">ต้องแนบเอกสาร</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">หักยอด</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">ลาช่วงทดลองงาน</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">คำขอ</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leaveTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 font-medium text-gray-900">{lt.name}</td>
                    <td className="px-5 py-4 text-center text-gray-600">
                      {lt.maxDaysPerYear ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center text-gray-600">
                      {lt.maxDaysPerRequest ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BoolBadge value={lt.requiresAttachment} yes="ต้องการ" no="ไม่ต้องการ" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BoolBadge value={lt.deductFromBalance} yes="หัก" no="ไม่หัก" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <BoolBadge value={lt.allowDuringProbation} yes="อนุญาต" no="ไม่อนุญาต" />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-700 font-semibold text-xs">
                        {lt._count.leaveRequests}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/settings/leave-types/${lt.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
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
      </section>

      {/* Positions Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">ตำแหน่งงาน</h2>
            <p className="text-sm text-gray-500">ทั้งหมด {positions.length} ตำแหน่ง</p>
          </div>
          <Link
            href="/admin/settings/positions/new"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <span className="text-lg leading-none">+</span> เพิ่มตำแหน่ง
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {positions.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">🏷️</p>
              <p className="font-medium">ยังไม่มีตำแหน่งงาน</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">#</th>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">ชื่อตำแหน่ง</th>
                  <th className="text-center px-5 py-3 font-semibold text-gray-600">จำนวนพนักงาน</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {positions.map((pos, idx) => (
                  <tr key={pos.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4 text-gray-400">{idx + 1}</td>
                    <td className="px-5 py-4 font-medium text-gray-900">{pos.name}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-700 font-semibold text-sm">
                        {pos._count.employees}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/settings/positions/${pos.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
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
      </section>
    </div>
  )
}

function BoolBadge({ value, yes, no }: { value: boolean; yes: string; no: string }) {
  return value ? (
    <span className="inline-block bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
      {yes}
    </span>
  ) : (
    <span className="inline-block bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
      {no}
    </span>
  )
}
