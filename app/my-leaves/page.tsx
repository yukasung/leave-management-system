import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { durationLabel } from '@/lib/leave-calc'

const statusLabel: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'รออนุมัติ',  className: 'bg-yellow-100 text-yellow-700' },
  IN_REVIEW: { label: 'กำลังพิจารณา', className: 'bg-blue-100 text-blue-700' },
  APPROVED:  { label: 'อนุมัติแล้ว', className: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'ไม่อนุมัติ',  className: 'bg-red-100 text-red-600' },
}

export default async function MyLeaveHistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      leaveType: { select: { name: true } },
    },
  })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ประวัติการลาของฉัน</h1>
        <p className="text-sm text-gray-500 mt-1">ทั้งหมด {requests.length} รายการ</p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-16 bg-white rounded-2xl shadow-sm">
          ยังไม่มีประวัติการลา
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl shadow-sm">
          <table className="w-full bg-white text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 font-semibold">
                <th className="px-5 py-3">ประเภทการลา</th>
                <th className="px-5 py-3">วันที่เริ่มต้น</th>
                <th className="px-5 py-3">วันที่สิ้นสุด</th>
                <th className="px-5 py-3 text-center">จำนวน</th>
                <th className="px-5 py-3">ช่วงเวลา</th>
                <th className="px-5 py-3">เหตุผล</th>
                <th className="px-5 py-3 text-center">สถานะ</th>
                <th className="px-5 py-3">วันที่ส่งคำขอ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => {
                const status = statusLabel[req.status] ?? { label: req.status, className: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {req.leaveType.name}
                    </td>
                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                      {req.startDate.toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                      {req.endDate.toLocaleDateString('th-TH')}
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-gray-900">
                      {req.totalDays} วัน
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-xs">
                      {durationLabel(req.durationType as Parameters<typeof durationLabel>[0])}
                    </td>
                    <td className="px-5 py-4 text-gray-600 max-w-xs truncate">
                      {req.reason || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                      {req.createdAt.toLocaleDateString('th-TH')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
