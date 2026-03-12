import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getUsedLeaveDaysThisYear } from '@/lib/leave-policy'
import EditLeaveForm from '../../EditLeaveForm'
import AdminLayout from '@/components/admin-layout'

export default async function EditLeavePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const leave = await prisma.leaveRequest.findUnique({
    where: { id },
    select: {
      id:               true,
      userId:           true,
      status:           true,
      leaveTypeId:      true,
      leaveStartDateTime: true,
      leaveEndDateTime:   true,
      totalDays:         true,
      reason:            true,
      documentUrl:       true,
    },
  })

  if (!leave) notFound()

  const isPrivileged = session.user.isAdmin
  const isManager   = session.user.isManager

  // Check if caller is an approver of this leave
  let isApprover = false
  if (isManager && !isPrivileged && leave.userId !== session.user.id) {
    const approval = await prisma.approval.findFirst({
      where: { leaveRequestId: leave.id, approverId: session.user.id },
    })
    if (!approval) {
      // Also check if employee's manager is current user
      const employee = await prisma.employee.findFirst({
        where: { userId: leave.userId, managerId: session.user.id },
      })
      isApprover = !!employee
    } else {
      isApprover = true
    }
  }

  // Only the owner, HR/ADMIN, or manager/approver may visit this page
  if (leave.userId !== session.user.id && !isPrivileged && !isApprover) {
    redirect('/my-leaves')
  }

  // Fields are editable only for DRAFT
  const isEditable = leave.status === 'DRAFT'

  // Admin can perform actions (approve/reject/cancel) from the detail view
  const canAdminAction =
    isPrivileged &&
    ['PENDING', 'IN_REVIEW', 'APPROVED', 'CANCEL_REQUESTED'].includes(leave.status)

  const year = new Date().getFullYear()
  const [leaveTypes, balances] = await Promise.all([
    prisma.leaveType.findMany({
      orderBy: { name: 'asc' },
      select: {
        id:                  true,
        name:                true,
        maxDaysPerYear:      true,
        maxDaysPerRequest:   true,
        requiresAttachment:  true,
        deductFromBalance:   true,
        allowDuringProbation: true,
      },
    }),
    prisma.leaveBalance.findMany({
      where: { userId: leave.userId, year },
      select: { leaveTypeId: true, totalDays: true, usedDays: true },
    }),
  ])

  const nonBalanceTypes = leaveTypes.filter(
    (lt) => !lt.deductFromBalance && lt.maxDaysPerYear !== null
  )
  const usageEntries = await Promise.all(
    nonBalanceTypes.map(async (lt) => {
      const used = await getUsedLeaveDaysThisYear(leave.userId, lt.id)
      return [lt.id, used] as const
    })
  )
  const usageByType: Record<string, number> = Object.fromEntries(usageEntries)

  const balanceByType: Record<string, { totalDays: number; usedDays: number }> =
    Object.fromEntries(balances.map((b) => [b.leaveTypeId, b]))

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  })

  // Format a Date → "YYYY-MM-DDTHH:mm" for datetime-local inputs
  const toDateTimeLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
    isManager: session.user.isManager,
  }

  return (
    <AdminLayout title={isEditable ? 'แก้ไขคำขอลา' : 'รายละเอียดคำขอลา'} user={user}>
      <div className="max-w-2xl mx-auto">
        <EditLeaveForm
          leaveId={leave.id}
          existing={{
            leaveTypeId:        leave.leaveTypeId,
            leaveStartDateTime: toDateTimeLocal(leave.leaveStartDateTime),
            leaveEndDateTime:   toDateTimeLocal(leave.leaveEndDateTime),
            totalDays:          leave.totalDays,
            reason:             leave.reason ?? '',
            documentUrl:        leave.documentUrl ?? '',
            status:             leave.status,
          }}
          leaveTypes={leaveTypes}
          balanceByType={balanceByType}
          usageByType={usageByType}
          isEditable={isEditable}
          isPrivileged={isPrivileged}
          canApprove={isApprover && (leave.status === 'PENDING' || leave.status === 'IN_REVIEW')}
          canAdminAction={canAdminAction}
          backHref={isApprover ? '/manager/leave-requests' : isPrivileged ? '/hr/leave-requests' : '/my-leaves'}
        />
      </div>
    </AdminLayout>
  )
}
