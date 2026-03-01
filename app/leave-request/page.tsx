import { prisma } from '@/lib/prisma'
import LeaveRequestForm from './LeaveRequestForm'

export default async function LeaveRequestPage() {
  const leaveTypes = await prisma.leaveType.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, daysPerYear: true },
  })

  return <LeaveRequestForm leaveTypes={leaveTypes} />
}
