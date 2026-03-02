import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import LeaveRequestForm from './LeaveRequestForm'
import { getUsedLeaveDaysThisYear } from '@/lib/leave-policy'

export default async function LeaveRequestPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const year = new Date().getFullYear()

  const [leaveTypes, balances] = await Promise.all([
    prisma.leaveType.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        maxDaysPerYear: true,
        maxDaysPerRequest: true,
        requiresAttachment: true,
        deductFromBalance: true,
        allowDuringProbation: true,
      },
    }),
    prisma.leaveBalance.findMany({
      where: { userId: session.user.id, year },
      select: { leaveTypeId: true, totalDays: true, usedDays: true },
    }),
  ])

  // Yearly usage for types that DON'T deduct from balance (so we can still show quota)
  const nonBalanceTypes = leaveTypes.filter(
    (lt) => !lt.deductFromBalance && lt.maxDaysPerYear !== null
  )
  const usageEntries = await Promise.all(
    nonBalanceTypes.map(async (lt) => {
      const used = await getUsedLeaveDaysThisYear(session.user.id, lt.id)
      return [lt.id, used] as const
    })
  )
  const usageByType: Record<string, number> = Object.fromEntries(usageEntries)

  const balanceByType: Record<string, { totalDays: number; usedDays: number }> =
    Object.fromEntries(balances.map((b) => [b.leaveTypeId, b]))

  return (
    <LeaveRequestForm
      leaveTypes={leaveTypes}
      balanceByType={balanceByType}
      usageByType={usageByType}
    />
  )
}
