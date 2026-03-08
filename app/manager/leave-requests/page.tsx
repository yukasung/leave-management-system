import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LeaveRequestTable from './LeaveRequestTable'
import AdminLayout from '@/components/admin-layout'

export default async function ManagerLeaveRequestsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

  const [requests, dbUser] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        status: 'PENDING',
        user: { employee: { manager: { userId } } },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { name: true, email: true } },
        leaveType: { select: { name: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
  }

  return (
    <AdminLayout title="คำขอลาที่รออนุมัติ" user={user}>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">คำขอลาที่รออนุมัติ</h2>
            <p className="text-sm text-muted-foreground mt-0.5">จำนวน {requests.length} รายการ</p>
          </div>
          <span className="px-3 py-1 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 text-sm font-medium rounded-full border border-amber-200 dark:border-amber-800/50">
            PENDING
          </span>
        </div>

        <LeaveRequestTable requests={requests} />
      </div>
    </AdminLayout>
  )
}
