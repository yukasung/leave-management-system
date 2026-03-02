import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { LeaveStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { HRActionButtons } from './HRActionButtons'

const STATUS_LABELS: Record<string, string> = {
  ALL: 'ทั้งหมด',
  PENDING: 'รอ Manager',
  IN_REVIEW: 'รอ HR',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

import { formatDate } from '@/lib/format-date'

export default async function HRLeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const session = await auth()

  if (!session || (session.user.role !== 'HR' && session.user.role !== 'ADMIN')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-lg font-semibold">Unauthorized</p>
      </div>
    )
  }

  const activeStatus = (status ?? 'IN_REVIEW').toUpperCase()

  const whereStatus =
    activeStatus !== 'ALL' && Object.keys(LeaveStatus).includes(activeStatus)
      ? (activeStatus as LeaveStatus)
      : undefined

  const requests = await prisma.leaveRequest.findMany({
    where: whereStatus ? { status: whereStatus } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { name: true } },
    },
  })

  const tabs = ['ALL', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'] as const

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">HR — ประวัติคำขอลาทั้งหมด</h1>
          <p className="text-sm text-gray-500 mt-1">
            แสดง {requests.length} รายการ
            {activeStatus !== 'ALL' ? ` · กรอง: ${STATUS_LABELS[activeStatus]}` : ''}
          </p>
        </div>
        <a
          href="/api/export/leave"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          Export CSV
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {tabs.map((tab) => {
          const isActive = activeStatus === tab
          return (
            <Link
              key={tab}
              href={tab === 'IN_REVIEW' ? '/hr/leave-requests' : `/hr/leave-requests?status=${tab}`}
              className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {STATUS_LABELS[tab]}
            </Link>
          )
        })}
      </div>

      {/* Table */}
      {requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400">ไม่พบรายการ</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ชื่อพนักงาน</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">แผนก</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ประเภทการลา</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">วันที่เริ่ม</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">วันที่สิ้นสุด</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">จำนวนวัน</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ช่วงเวลา</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">สถานะ</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {requests.map((req, index) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-400">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{req.user.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {req.user.department?.name ?? (
                      <span className="text-gray-300 italic">ไม่ระบุ</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{req.leaveType.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(req.startDate)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(req.endDate)}</td>
                  <td className="px-4 py-3 text-gray-600 font-semibold">{req.totalDays}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {req.startDurationType === req.endDurationType
                      ? (req.startDurationType === 'FULL_DAY' ? 'เต็มวัน' : req.startDurationType === 'HALF_DAY_MORNING' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย')
                      : `เริ่ม: ${req.startDurationType === 'HALF_DAY_MORNING' ? 'เช้า' : req.startDurationType === 'HALF_DAY_AFTERNOON' ? 'บ่าย' : 'เต็มวัน'} / สิ้นสุด: ${req.endDurationType === 'HALF_DAY_MORNING' ? 'เช้า' : req.endDurationType === 'HALF_DAY_AFTERNOON' ? 'บ่าย' : 'เต็มวัน'}`
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[req.status] ?? 'bg-gray-100 text-gray-600'}`}
                    >
                      {STATUS_LABELS[req.status] ?? req.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {req.status === 'IN_REVIEW' ? (
                      <HRActionButtons id={req.id} />
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
