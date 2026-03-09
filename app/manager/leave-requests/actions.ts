'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'
import { logLeaveFieldChanges, leaveFieldChange } from '@/lib/leave-audit-log.service'

export async function approveLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }

    const callerId = session.user.id
    const callerIsAdmin = session.user.isAdmin

    // Verify this user is either: HR/ADMIN, or the direct manager of the leave requester
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { userId: true, user: { select: { employee: { select: { managerId: true } } } } },
    })
    if (!leave) return { success: false, message: 'ไม่พบคำขอลา' }

    const managerEmpId = leave.user.employee?.managerId
    let isDirectManager = false
    if (managerEmpId) {
      const managerEmp = await prisma.employee.findUnique({
        where: { id: managerEmpId },
        select: { userId: true },
      })
      isDirectManager = managerEmp?.userId === callerId
    }

    if (!callerIsAdmin && !isDirectManager) {
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
        select: {
          userId: true,
          leaveTypeId: true,
          leaveStartDateTime: true,
          totalDays: true,
          leaveType: { select: { deductFromBalance: true } },
        },
      })

      const year = new Date(request.leaveStartDateTime).getFullYear()

      if (request.leaveType.deductFromBalance) {
        await tx.leaveBalance.updateMany({
          where: { userId: request.userId, leaveTypeId: request.leaveTypeId, year },
          data: { usedDays: { increment: request.totalDays } },
        })
      }

      await tx.auditLog.create({
        data: {
          userId: callerId,
          action: 'APPROVE_LEAVE',
          entityType: 'LeaveRequest',
          entityId: id,
          description: `อนุมัติคำขอลา: ${request.totalDays} วัน`,
        },
      })

      await logLeaveFieldChanges(tx, id, callerId, [
        leaveFieldChange.status(oldLeave?.status ?? null, 'APPROVED'),
      ])

      await tx.notification.create({
        data: {
          userId: request.userId,
          message: `คำขอลา ${request.totalDays} วันของคุณได้รับการอนุมัติแล้ว`,
          isRead: false,
        },
      })
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
          description: 'ผู้จัดการปฏิเสธคำขอลา',
        },
      })

      await logLeaveFieldChanges(tx, id, session.user.id, [
        leaveFieldChange.status(oldLeave?.status ?? null, 'REJECTED'),
      ])

      await tx.notification.create({
        data: {
          userId: request.userId,
          message: 'คำขอลาของคุณถูกปฏิเสธแล้ว',
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
