import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LeaveRequestTable from './LeaveRequestTable'

export default async function ManagerLeaveRequestsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  // Only show requests from employees who report directly to this user
  const requests = await prisma.leaveRequest.findMany({
    where: {
      status: 'PENDING',
      user: { employee: { manager: { userId } } },
    },
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
