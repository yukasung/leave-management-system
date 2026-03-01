'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export async function approveLeaveRequest(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const role = session.user.role

  if (role !== 'MANAGER' && role !== 'HR' && role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.$transaction(async (tx) => {
    if (role === 'MANAGER') {
      // Manager: move to IN_REVIEW, notify HR
      const request = await tx.leaveRequest.update({
        where: { id },
        data: { status: 'IN_REVIEW' },
        include: { user: { select: { name: true } } },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'APPROVE_LEAVE',
          entityType: 'LeaveRequest',
          entityId: id,
          description: 'Manager approved leave request — pending HR review',
        },
      })

      const hrUsers = await tx.user.findMany({
        where: { role: 'HR' },
        select: { id: true },
      })

      if (hrUsers.length > 0) {
        await tx.notification.createMany({
          data: hrUsers.map((hr) => ({
            userId: hr.id,
            message: `Leave request from ${request.user.name} needs HR approval`,
            isRead: false,
          })),
        })
      }
    } else {
      // HR / ADMIN: final approval, deduct balance, notify employee
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
        data: { usedDays: { increment: request.totalDays } },
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
    }
  })

  revalidatePath('/manager/leave-requests')
  revalidatePath('/hr/leave-requests')
  revalidatePath('/leave-balance')
}

export async function rejectLeaveRequest(id: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

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
        description: 'Manager rejected leave request',
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

  revalidatePath('/manager/leave-requests')
}
