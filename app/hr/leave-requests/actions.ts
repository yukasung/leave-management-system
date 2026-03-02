'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'
import { logLeaveFieldChanges, leaveFieldChange } from '@/lib/leave-audit-log.service'

export async function hrApproveLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (session.user.role !== 'HR' && session.user.role !== 'ADMIN') {
      return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }
    }

    await prisma.$transaction(async (tx) => {
      const oldLeave = await tx.leaveRequest.findUnique({
        where: { id },
        select: { status: true },
      })

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

      await logLeaveFieldChanges(tx, id, session.user.id, [
        leaveFieldChange.status(oldLeave?.status ?? null, 'APPROVED'),
      ])

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

    return { success: true, message: 'อนุมัติคำขอเรียบร้อยแล้ว' }
  } catch {
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}

export async function hrRejectLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (session.user.role !== 'HR' && session.user.role !== 'ADMIN') {
      return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }
    }

    await prisma.$transaction(async (tx) => {
      const oldLeave = await tx.leaveRequest.findUnique({
        where: { id },
        select: { status: true },
      })

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

      await logLeaveFieldChanges(tx, id, session.user.id, [
        leaveFieldChange.status(oldLeave?.status ?? null, 'REJECTED'),
      ])

      await tx.notification.create({
        data: {
          userId: request.userId,
          message: 'Your leave request has been rejected',
          isRead: false,
        },
      })
    })

    revalidatePath('/hr/leave-requests')

    return { success: true, message: 'ปฏิเสธคำขอเรียบร้อยแล้ว' }
  } catch {
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}
