import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getUsedLeaveDaysThisYear } from '@/lib/leave-policy'
import EditLeaveForm from '../../EditLeaveForm'

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
      startDate:        true,
      endDate:          true,
      startDurationType: true,
      endDurationType:   true,
      totalDays:         true,
      reason:            true,
      documentUrl:       true,
    },
  })

  if (!leave) notFound()

  const isPrivileged =
    session.user.role === 'HR' || session.user.role === 'ADMIN'

  // Only the owner (or HR/ADMIN) may visit this page
  if (leave.userId !== session.user.id && !isPrivileged) {
    redirect('/my-leaves')
  }

  // Fields are editable only for DRAFT (any caller) or APPROVED (HR/ADMIN override)
  const isEditable =
    leave.status === 'DRAFT' ||
    (leave.status === 'APPROVED' && isPrivileged)

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

  return (
    <EditLeaveForm
      leaveId={leave.id}
      existing={{
        leaveTypeId:       leave.leaveTypeId,
        startDate:         leave.startDate.toISOString().split('T')[0],
        endDate:           leave.endDate.toISOString().split('T')[0],
        startDurationType: leave.startDurationType as 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON',
        endDurationType:   leave.endDurationType as 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON',
        totalDays:         leave.totalDays,
        reason:            leave.reason ?? '',
        documentUrl:       leave.documentUrl ?? '',
        status:            leave.status,
      }}
      leaveTypes={leaveTypes}
      balanceByType={balanceByType}
      usageByType={usageByType}
      isEditable={isEditable}
      isPrivileged={isPrivileged}
    />
  )
}
