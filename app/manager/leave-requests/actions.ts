'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'
import { logLeaveFieldChanges, leaveFieldChange } from '@/lib/leave-audit-log.service'
import { sendMail, buildLeaveApprovedEmail } from '@/lib/mailer'

export async function approveLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }

    const callerId = session.user.id
    const callerIsAdmin = session.user.isAdmin

    // Verify this user is either: HR/ADMIN, direct manager, or an assigned approver
    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      select: {
        userId: true,
        user: {
          select: {
            employee: {
              select: {
                managerId: true,
                approvers: { select: { userId: true } },
              },
            },
          },
        },
      },
    })
    if (!leave) return { success: false, message: 'ไม่พบคำขอลา' }

    // Check if caller is in the approvers list (many-to-many)
    const isApprover = leave.user.employee?.approvers.some((a) => a.userId === callerId) ?? false

    // Check if caller is the direct manager (via managerId)
    const managerEmpId = leave.user.employee?.managerId
    let isDirectManager = false
    if (managerEmpId) {
      const managerEmp = await prisma.employee.findUnique({
        where: { id: managerEmpId },
        select: { userId: true },
      })
      isDirectManager = managerEmp?.userId === callerId
    }

    if (!callerIsAdmin && !isDirectManager && !isApprover) {
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
        userId: callerId,
        action: 'APPROVE_LEAVE',
        entityType: 'LeaveRequest',
        entityId: id,
        description: `อนุมัติคำขอลา: ${request.totalDays} วัน`,
      },
    })

    await logLeaveFieldChanges(prisma, id, callerId, [
      leaveFieldChange.status(oldLeave?.status ?? null, 'APPROVED'),
    ])

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
        console.error('[approveLeaveRequest] email failed:', err)
      }
    })()

    revalidatePath('/manager/leave-requests')
    revalidatePath('/hr/leave-requests')
    revalidatePath('/leave-balance')

    return { success: true, message: 'ดำเนินการอนุมัติเรียบร้อยแล้ว' }
  } catch (e) {
    console.error('[approveLeaveRequest]', e)
    return { success: false, message: e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}

export async function rejectLeaveRequest(id: string): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }

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
        description: 'ผู้จัดการปฏิเสธคำขอลา',
      },
    })

    await logLeaveFieldChanges(prisma, id, session.user.id, [
      leaveFieldChange.status(oldLeave?.status ?? null, 'REJECTED'),
    ])

    revalidatePath('/manager/leave-requests')
    revalidatePath('/hr/leave-requests')

    return { success: true, message: 'ปฏิเสธคำขอเรียบร้อยแล้ว' }
  } catch {
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}
