'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'
import { logLeaveFieldChanges, leaveFieldChange } from '@/lib/leave-audit-log.service'
import { sendMail, buildLeaveApprovedEmail, buildLeaveCancelApprovedEmail } from '@/lib/mailer'

export async function hrApproveLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (!session.user.isAdmin) {
      return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }
    }

    const oldLeave = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { status: true },
    })

    const request = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'APPROVED' },
      select: {
        userId: true,
        leaveTypeId: true,
        leaveStartDateTime: true,
        leaveEndDateTime: true,
        totalDays: true,
        user: { select: { email: true, name: true } },
        leaveType: { select: { name: true } },
      },
    })

    const year = new Date(request.leaveStartDateTime).getFullYear()

    await prisma.leaveBalance.updateMany({
      where: { userId: request.userId, leaveTypeId: request.leaveTypeId, year },
      data: { usedDays: { increment: request.totalDays } },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'APPROVE_LEAVE',
        entityType: 'LeaveRequest',
        entityId: id,
        description: 'HR อนุมัติคำขอลาแล้ว',
      },
    })

    await logLeaveFieldChanges(prisma, id, session.user.id, [
      leaveFieldChange.status(oldLeave?.status ?? null, 'APPROVED'),
    ])

    // Mark all pending approvals as APPROVED
    await prisma.approval.updateMany({
      where: { leaveRequestId: id, status: 'PENDING' },
      data:  { status: 'APPROVED' },
    })

    // Fire-and-forget email to employee
    void (async () => {
      try {
        const email = request.user?.email
        if (email) {
          const { subject, html, text } = buildLeaveApprovedEmail({
            employeeName:       request.user?.name ?? '',
            leaveTypeName:      request.leaveType?.name ?? '',
            totalDays:          request.totalDays,
            leaveStartDateTime: request.leaveStartDateTime,
            leaveEndDateTime:   request.leaveEndDateTime,
            leaveRequestId:     id,
          })
          await sendMail({ to: email, subject, html, text })
        }
      } catch (err) {
        console.error('[hrApproveLeaveRequest] email failed:', err)
      }
    })()

    revalidatePath('/hr/leave-requests')
    revalidatePath('/leave-balance')

    return { success: true, message: 'อนุมัติคำขอเรียบร้อยแล้ว' }
  } catch (e) {
    console.error('[hrApproveLeaveRequest]', e)
    return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}

export async function hrRejectLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (!session.user.isAdmin) {
      return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }
    }

    const oldLeave = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { status: true },
    })

    const request = await prisma.leaveRequest.update({
      where: { id },
      data: { status: 'REJECTED' },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REJECT_LEAVE',
        entityType: 'LeaveRequest',
        entityId: id,
        description: 'HR ปฏิเสธคำขอลา',
      },
    })

    await logLeaveFieldChanges(prisma, id, session.user.id, [
      leaveFieldChange.status(oldLeave?.status ?? null, 'REJECTED'),
    ])

    // Mark all pending approvals as REJECTED
    await prisma.approval.updateMany({
      where: { leaveRequestId: id, status: 'PENDING' },
      data:  { status: 'REJECTED' },
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

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      select: {
        status: true,
        userId: true,
        leaveTypeId: true,
        leaveStartDateTime: true,
        leaveEndDateTime: true,
        totalDays: true,
        leaveType: { select: { name: true, deductFromBalance: true } },
        user: { select: { name: true, email: true } },
      },
    })
    if (!leave) return { success: false, message: 'ไม่พบคำขอลา' }
    if (leave.status !== 'CANCEL_REQUESTED') return { success: false, message: 'สถานะไม่ถูกต้อง' }

    await prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } })

    // Only restore balance if this leave was actually APPROVED at some point
    // (PENDING → CANCEL_REQUESTED never had usedDays incremented)
    const wasApproved = await prisma.leaveAuditLog.findFirst({
      where: { leaveId: id, fieldChanged: 'status', newValue: 'APPROVED' },
    })
    if (wasApproved) {
      const cancelYear = new Date(leave.leaveStartDateTime).getFullYear()
      await prisma.leaveBalance.updateMany({
        where: { userId: leave.userId, leaveTypeId: leave.leaveTypeId, year: cancelYear },
        data: { usedDays: { decrement: leave.totalDays } },
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HR_OVERRIDE_CANCEL_LEAVE',
        entityType: 'LeaveRequest',
        entityId: id,
        description: `HR อนุมัติการยกเลิกลา: ${leave.leaveType.name} — ${leave.totalDays} วัน`,
      },
    })

    await logLeaveFieldChanges(prisma, id, session.user.id, [
      leaveFieldChange.status('CANCEL_REQUESTED', 'CANCELLED'),
    ])

    // Fire-and-forget email to the employee
    void (async () => {
      try {
        const email = leave.user?.email
        if (email) {
          const { subject, html, text } = buildLeaveCancelApprovedEmail({
            employeeName:       leave.user?.name ?? '',
            leaveTypeName:      leave.leaveType.name,
            totalDays:          leave.totalDays,
            leaveStartDateTime: leave.leaveStartDateTime,
            leaveEndDateTime:   leave.leaveEndDateTime,
            leaveRequestId:     id,
          })
          await sendMail({ to: email, subject, html, text })
        }
      } catch (err) {
        console.error('[hrApproveCancellation] email failed:', err)
      }
    })()

    revalidatePath('/hr/leave-requests')
    revalidatePath('/leave-balance')
    return { success: true, message: 'อนุมัติการยกเลิกเรียบร้อยแล้ว' }
  } catch (e) {
    console.error('[hrApproveCancellation]', e)
    return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}

// Reject a CANCEL_REQUESTED leave → revert back to APPROVED
export async function hrRejectCancellation(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (!session.user.isAdmin) return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      select: { status: true, userId: true, leaveType: { select: { name: true } } },
    })
    if (!leave) return { success: false, message: 'ไม่พบคำขอลา' }
    if (leave.status !== 'CANCEL_REQUESTED') return { success: false, message: 'สถานะไม่ถูกต้อง' }

    // Find the status that existed before CANCEL_REQUESTED was set
    const prevAudit = await prisma.leaveAuditLog.findFirst({
      where: { leaveId: id, fieldChanged: 'status', newValue: 'CANCEL_REQUESTED' },
      orderBy: { timestamp: 'desc' },
    })
    const revertTo = (prevAudit?.oldValue ?? 'APPROVED') as string

    await prisma.leaveRequest.update({ where: { id }, data: { status: revertTo } })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'REJECT_LEAVE',
        entityType: 'LeaveRequest',
        entityId: id,
        description: `HR ปฏิเสธคำขอยกเลิกลา: ${leave.leaveType.name} (คืนสถานะเป็น ${revertTo})`,
      },
    })

    await logLeaveFieldChanges(prisma, id, session.user.id, [
      leaveFieldChange.status('CANCEL_REQUESTED', revertTo),
    ])

    revalidatePath('/hr/leave-requests')
    return { success: true, message: 'ปฏิเสธคำขอยกเลิกเรียบร้อยแล้ว' }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}

// Admin/HR force-cancel an APPROVED leave
export async function hrAdminCancelApproved(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (!session.user.isAdmin) return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      select: {
        status: true,
        userId: true,
        leaveTypeId: true,
        leaveStartDateTime: true,
        totalDays: true,
        leaveType: { select: { name: true } },
      },
    })
    if (!leave) return { success: false, message: 'ไม่พบคำขอลา' }
    if (leave.status !== 'APPROVED') return { success: false, message: 'ยกเลิกได้เฉพาะคำขอลาที่อนุมัติแล้วเท่านั้น' }

    await prisma.leaveRequest.update({ where: { id }, data: { status: 'CANCELLED' } })

    // Restore usedDays (leave was APPROVED so usedDays was incremented)
    const cancelYear = new Date(leave.leaveStartDateTime).getFullYear()
    await prisma.leaveBalance.updateMany({
      where: { userId: leave.userId, leaveTypeId: leave.leaveTypeId, year: cancelYear },
      data: { usedDays: { decrement: leave.totalDays } },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HR_OVERRIDE_CANCEL_LEAVE',
        entityType: 'LeaveRequest',
        entityId: id,
        description: `[Admin] ยกเลิกวันลาที่อนุมัติ: ${leave.leaveType.name} — ${leave.totalDays} วัน`,
      },
    })

    await logLeaveFieldChanges(prisma, id, session.user.id, [
      leaveFieldChange.status('APPROVED', 'CANCELLED'),
    ])

    revalidatePath('/hr/leave-requests')
    revalidatePath('/leave-balance')
    return { success: true, message: 'ยกเลิกวันลาเรียบร้อยแล้ว' }
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด' }
  }
}
