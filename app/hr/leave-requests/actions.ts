'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function hrApproveLeaveRequest(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  if (session.user.role !== 'HR' && session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
    })

    const year = new Date(request.startDate).getFullYear()

    await tx.leaveBalance.updateMany({
      where: {
        userId: request.userId,
        leaveTypeId: request.leaveTypeId,
        year,
      },
      data: {
        usedDays: { increment: request.totalDays },
      },
    })

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'APPROVE_LEAVE',
        entityType: 'LeaveRequest',
        entityId: id,
        description: 'HR approved leave request',
      },
    })

    await tx.notification.create({
      data: {
        userId: request.userId,
        message: 'Your leave request has been approved',
        isRead: false,
      },
    })
  })

  revalidatePath('/hr/leave-requests')
  revalidatePath('/leave-balance')
}

export async function hrRejectLeaveRequest(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')
  if (session.user.role !== 'HR' && session.user.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.$transaction(async (tx) => {
    const request = await tx.leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    })

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REJECT_LEAVE',
        entityType: 'LeaveRequest',
        entityId: id,
        description: 'HR rejected leave request',
      },
    })

    await tx.notification.create({
      data: {
        userId: request.userId,
        message: 'Your leave request has been rejected',
        isRead: false,
      },
    })
  })

  revalidatePath('/hr/leave-requests')
}
