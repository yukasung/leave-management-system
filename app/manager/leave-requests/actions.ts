'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export async function approveLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }

    const role = session.user.role
    if (role !== 'MANAGER' && role !== 'HR' && role !== 'ADMIN') {
      return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }
    }

    await prisma.$transaction(async (tx) => {
      if (role === 'MANAGER') {
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
        const request = await tx.leaveRequest.update({
          where: { id },
          data: { status: 'APPROVED' },
          select: {
            userId: true,
            leaveTypeId: true,
            startDate: true,
            totalDays: true,
            startDurationType: true,
            endDurationType: true,
            leaveType: { select: { deductFromBalance: true } },
          },
        })

        const year = new Date(request.startDate).getFullYear()

        // Only deduct balance for leave types that are configured to do so
        if (request.leaveType.deductFromBalance) {
          await tx.leaveBalance.updateMany({
            where: {
              userId: request.userId,
              leaveTypeId: request.leaveTypeId,
              year,
            },
            data: { usedDays: { increment: request.totalDays } },
          })
        }

        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'APPROVE_LEAVE',
            entityType: 'LeaveRequest',
            entityId: id,
            description: `HR approved leave request: ${request.totalDays} day(s) [start:${request.startDurationType} end:${request.endDurationType}]`,
          },
        })

        await tx.notification.create({
          data: {
            userId: request.userId,
            message: `Your leave request for ${request.totalDays} day(s) has been approved`,
            isRead: false,
          },
        })
      }
    })

    revalidatePath('/manager/leave-requests')
    revalidatePath('/hr/leave-requests')
    revalidatePath('/leave-balance')

    return { success: true, message: 'ดำเนินการอนุมัติเรียบร้อยแล้ว' }
  } catch {
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}

export async function rejectLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }

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
    revalidatePath('/hr/leave-requests')

    return { success: true, message: 'ปฏิเสธคำขอเรียบร้อยแล้ว' }
  } catch {
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}
