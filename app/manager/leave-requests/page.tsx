import { prisma } from '@/lib/prisma'
import LeaveRequestTable from './LeaveRequestTable'

export default async function ManagerLeaveRequestsPage() {
  const requests = await prisma.leaveRequest.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    include: {
      user: { select: { name: true, email: true } },
      leaveType: { select: { name: true } },
    },
  })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">คำขอลาที่รออนุมัติ</h1>
          <p className="text-sm text-gray-500 mt-1">จำนวน {requests.length} รายการ</p>
        </div>
        <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
          PENDING
        </span>
      </div>

      <LeaveRequestTable requests={requests} />
    </div>
  )
}
