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
    if (!session.user.isAdmin) {
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

      const year = new Date(request.leaveStartDateTime).getFullYear()

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
          description: 'HR อนุมัติคำขอลาแล้ว',
        },
      })

      await logLeaveFieldChanges(tx, id, session.user.id, [
        leaveFieldChange.status(oldLeave?.status ?? null, 'APPROVED'),
      ])

      await tx.notification.create({
        data: {
          userId: request.userId,
          message: 'คำขอลาของคุณได้รับการอนุมัติแล้ว',
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
    if (!session.user.isAdmin) {
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
          description: 'HR ปฏิเสธคำขอลา',
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

    revalidatePath('/hr/leave-requests')

    return { success: true, message: 'ปฏิเสธคำขอเรียบร้อยแล้ว' }
  } catch {
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}

// Approve a CANCEL_REQUESTED leave → CANCELLED + restore balance
export async function hrApproveCancellation(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (!session.user.isAdmin) return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }

    await prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.findUnique({
        where: { id },
        select: {
          status: true,
          userId: true,
          leaveTypeId: true,
          leaveStartDateTime: true,
          totalDays: true,
          leaveType: { select: { name: true, deductFromBalance: true } },
        },
      })
      if (!leave) throw new Error('ไม่พบคำขอลา')
      if (leave.status !== 'CANCEL_REQUESTED') throw new Error('สถานะไม่ถูกต้อง')

      await tx.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } })

      if (leave.leaveType.deductFromBalance) {
        const year = new Date(leave.leaveStartDateTime).getFullYear()
        await tx.leaveBalance.updateMany({
          where: { userId: leave.userId, leaveTypeId: leave.leaveTypeId, year },
          data: { usedDays: { decrement: leave.totalDays } },
        })
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'HR_OVERRIDE_CANCEL_LEAVE',
          entityType: 'LeaveRequest',
          entityId: id,
          description: `HR อนุมัติการยกเลิกลา: ${leave.leaveType.name} — ${leave.totalDays} วัน`,
        },
      })

      await logLeaveFieldChanges(tx, id, session.user.id, [
        leaveFieldChange.status('CANCEL_REQUESTED', 'CANCELLED'),
      ])

      await tx.notification.create({
        data: {
          userId: leave.userId,
          message: `คำขอยกเลิกการลา "${leave.leaveType.name}" ได้รับการอนุมัติแล้ว` +
            (leave.leaveType.deductFromBalance ? ` (คืน ${leave.totalDays} วัน)` : ''),
          isRead: false,
        },
      })
    })

    revalidatePath('/hr/leave-requests')
    revalidatePath('/leave-balance')
    return { success: true, message: 'อนุมัติการยกเลิกเรียบร้อยแล้ว' }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// Reject a CANCEL_REQUESTED leave → revert back to APPROVED
export async function hrRejectCancellation(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (!session.user.isAdmin) return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }

    await prisma.$transaction(async (tx) => {
      const leave = await tx.leaveRequest.findUnique({
        where: { id },
        select: { status: true, userId: true, leaveType: { select: { name: true } } },
      })
      if (!leave) throw new Error('ไม่พบคำขอลา')
      if (leave.status !== 'CANCEL_REQUESTED') throw new Error('สถานะไม่ถูกต้อง')

      await tx.leaveRequest.update({ where: { id }, data: { status: 'APPROVED' } })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'REJECT_LEAVE',
          entityType: 'LeaveRequest',
          entityId: id,
          description: `HR ปฏิเสธคำขอยกเลิกลา: ${leave.leaveType.name}`,
        },
      })

      await logLeaveFieldChanges(tx, id, session.user.id, [
        leaveFieldChange.status('CANCEL_REQUESTED', 'APPROVED'),
      ])

      await tx.notification.create({
        data: {
          userId: leave.userId,
          message: `คำขอยกเลิกการลา "${leave.leaveType.name}" ถูกปฏิเสธ — การลายังคงมีผล`,
          isRead: false,
        },
      })
    })

    revalidatePath('/hr/leave-requests')
    return { success: true, message: 'ปฏิเสธคำขอยกเลิกเรียบร้อยแล้ว' }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}
