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
      user: { select: { name: true } },
      approvals: {
        orderBy: { level: 'asc' },
        select: {
          level:    true,
          status:   true,
          approver: { select: { id: true, name: true } },
        },
      },
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
        leaveCategory:       true,
        leaveLimitType:      true,
        dayCountType:        true,
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

  // Build the full approver list from the employee's configured approvers
  // merged with actual Approval record statuses
  const employeeRecord = await prisma.employee.findFirst({
    where: { userId: leave.userId },
    select: {
      managerId: true,
      manager: { select: { user: { select: { id: true, name: true } } } },
      approvers: { select: { user: { select: { id: true, name: true } } } },
    },
  })

  const approvalStatusMap = new Map(
    leave.approvals.map((a) => [a.approver.id, a.status as string])
  )

  // Collect configured approvers (many-to-many first, then direct manager fallback)
  const configuredApprovers: { id: string; name: string }[] =
    (employeeRecord?.approvers ?? [])
      .filter((a) => a.user?.id)
      .map((a) => ({ id: a.user!.id, name: a.user!.name ?? '' }))

  if (configuredApprovers.length === 0 && employeeRecord?.manager?.user?.id) {
    configuredApprovers.push({
      id:   employeeRecord.manager.user.id,
      name: employeeRecord.manager.user.name ?? '',
    })
  }

  // Merge: configured approvers with their actual status; fall back to DB Approval records
  const allApprovers =
    configuredApprovers.length > 0
      ? configuredApprovers.map((ca, i) => ({
          level:        i + 1,
          status:       approvalStatusMap.get(ca.id) ?? 'PENDING',
          approverName: ca.name,
        }))
      : leave.approvals.map((a) => ({
          level:        a.level,
          status:       a.status as string,
          approverName: a.approver.name ?? '',
        }))

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
            requesterName:      leave.user?.name ?? '',
            approvals:          allApprovers,
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
