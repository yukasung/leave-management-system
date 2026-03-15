/**
 * Leave Request Service — business logic only.
 * No HTTP/form parsing here.  Controllers (server actions) call these functions.
 */
import 'server-only'

import { prisma } from './prisma'
import { getUsedLeaveDaysThisYear } from './leave-policy'

import { Prisma, LeaveStatus, ApprovalStatus } from '@prisma/client'
import { isPrivileged } from './role-guard'
import { logLeaveFieldChanges, leaveFieldChange } from './leave-audit-log.service'
import { sendMail, buildLeaveRequestEmail, buildLeaveCancelRequestEmail, buildLeaveCancelApprovedEmail } from './mailer'

// ── Types ────────────────────────────────────────────────────────────────────

export class LeaveServiceError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message)
    this.name = 'LeaveServiceError'
  }
}

export type CreateLeaveInput = {
  userId:              string
  leaveTypeId:         string
  leaveStartDateTime:  Date
  leaveEndDateTime:    Date
  totalDays:           number
  reason:              string | null
  documentUrl:         string | null
}

export type CreateLeaveResult = {
  leaveRequestId: string
}

export type UpdateLeaveInput = {
  leaveTypeId:         string
  leaveStartDateTime:  Date
  leaveEndDateTime:    Date
  totalDays:           number
  reason:              string | null
  documentUrl:         string | null
}

// ── Private helpers ──────────────────────────────────────────────────────────

async function logPolicyRejection(
  userId: string,
  description: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'POLICY_REJECTION',
        entityType: 'LeaveRequest',
        entityId: 'N/A',
        description,
      },
    })
  } catch {
    // Non-critical — do not surface to caller
  }
}

type ApproverTarget = {
  /** Stored in Approval record (FK must be non-null). */
  approverId: string
  /** All users who should receive a notification (manager or ALL admins). */
  notifyIds: string[]
}

async function resolveApproverTarget(
  employee: { managerId: string | null; approvers?: { userId: string | null }[] } | null | undefined
): Promise<ApproverTarget | null> {
  // 1. Use the new many-to-many approvers relation first
  const approverUsers = (employee?.approvers ?? []).map(a => a.userId).filter(Boolean) as string[]
  if (approverUsers.length > 0) {
    return { approverId: approverUsers[0], notifyIds: approverUsers }
  }

  // 2. Legacy fallback: single managerId
  if (employee?.managerId) {
    const managerEmp = await prisma.employee.findUnique({
      where: { id: employee.managerId },
      select: { userId: true },
    })
    if (managerEmp?.userId) {
      return { approverId: managerEmp.userId, notifyIds: [managerEmp.userId] }
    }
  }

  // 3. Fallback: all admin users receive the request (any one can approve)
  const adminUsers = await prisma.user.findMany({
    where: { role: { name: { in: ['ADMIN', 'HR'] } } },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (adminUsers.length === 0) return null
  return {
    approverId: adminUsers[0].id,
    notifyIds:  adminUsers.map((u) => u.id),
  }
}

// ── Service methods ──────────────────────────────────────────────────────────

/**
 * Validate leave policy and create a LeaveRequest with status = DRAFT.
 * Throws LeaveServiceError if any policy check fails.
 */
export async function createDraft(
  input: CreateLeaveInput
): Promise<CreateLeaveResult> {
  const {
    userId, leaveTypeId, leaveStartDateTime, leaveEndDateTime,
    totalDays, reason, documentUrl,
  } = input

  // ── Load leave type ───────────────────────────────────────────────────────
  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } })
  if (!leaveType) {
    throw new LeaveServiceError('ไม่พบประเภทการลา', 'leaveTypeId')
  }

  // ── Load requesting user ──────────────────────────────────────────────────
  const requestingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      employee: { select: { managerId: true, isProbation: true, approvers: { select: { userId: true } } } },
    },
  })

  // ── Policy: maxDaysPerRequest ─────────────────────────────────────────────
  if (leaveType.maxDaysPerRequest !== null && totalDays > leaveType.maxDaysPerRequest) {
    const msg = `เกินจำนวนวันลาสูงสุดต่อครั้ง: "${leaveType.name}" อนุญาตสูงสุด ${leaveType.maxDaysPerRequest} วัน (ขอลา ${totalDays} วัน)`
    await logPolicyRejection(userId, msg)
    throw new LeaveServiceError(msg)
  }

  // ── Policy: maxDaysPerYear ────────────────────────────────────────────────
  if (leaveType.maxDaysPerYear !== null) {
    const used = await getUsedLeaveDaysThisYear(userId, leaveTypeId)
    const remaining = leaveType.maxDaysPerYear - used
    if (used + totalDays > leaveType.maxDaysPerYear) {
      const msg = `เกินสิทธิ์ลาประจำปี "${leaveType.name}" (ใช้ไปแล้ว ${used} วัน / สูงสุด ${leaveType.maxDaysPerYear} วัน · คงเหลือ ${remaining} วัน)`
      await logPolicyRejection(userId, msg)
      throw new LeaveServiceError(msg)
    }
  }

  // ── Policy: requiresAttachment ────────────────────────────────────────────
  if (leaveType.requiresAttachment && !documentUrl) {
    throw new LeaveServiceError(
      `ประเภทการลา "${leaveType.name}" จำเป็นต้องแนบเอกสารประกอบ`,
      'documentUrl'
    )
  }

  // ── Policy: probation ─────────────────────────────────────────────────────
  if (requestingUser?.employee?.isProbation && !leaveType.allowDuringProbation) {
    const msg = `ไม่สามารถลา "${leaveType.name}" ได้ในช่วงทดลองงาน`
    await logPolicyRejection(userId, msg)
    throw new LeaveServiceError(msg)
  }

  // ── Transaction: balance check + create DRAFT ─────────────────────────────
  const leaveRequest = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const year = leaveStartDateTime.getUTCFullYear() || leaveStartDateTime.getFullYear()

    if (leaveType.deductFromBalance) {
      const balance = await tx.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: { userId, leaveTypeId, year },
        },
      })
      const remaining = (balance?.totalDays ?? 0) - (balance?.usedDays ?? 0)
      if (totalDays > remaining) {
        throw new Error(`สิทธิ์การลาไม่เพียงพอ (คงเหลือ ${remaining} วัน แต่ขอลา ${totalDays} วัน)`)
      }
    }

    const req = await tx.leaveRequest.create({
      data: {
        userId,
        leaveTypeId,
        leaveStartDateTime,
        leaveEndDateTime,
        totalDays,
        reason: reason || null,
        documentUrl: documentUrl || null,
        status: LeaveStatus.DRAFT,
      },
    })

    await tx.auditLog.create({
      data: {
        userId,
        action: 'CREATE_LEAVE_DRAFT',
        entityType: 'LeaveRequest',
        entityId: req.id,
        description: `Leave draft created: ${leaveType.name} — ${totalDays} day(s)`,
      },
    })

    await logLeaveFieldChanges(tx, req.id, userId, [
      leaveFieldChange.status(null, 'DRAFT'),
      leaveFieldChange.leaveTypeId(null, leaveTypeId),
      leaveFieldChange.leaveStartDateTime(null, leaveStartDateTime),
      leaveFieldChange.leaveEndDateTime(null, leaveEndDateTime),
    ])

    return req
  })

  return { leaveRequestId: leaveRequest.id }
}

/**
 * Edit a leave request's fields.
 *
 * Rules:
 *   DRAFT                  → owner or HR/ADMIN: full edit (policy checks apply).
 *   PENDING                → blocked: "Cannot edit pending leave. Please cancel and reapply."
 *   APPROVED               → HR/ADMIN only: override edit, bypasses normal policy
 *                            checks, adjusts balance, logs HR_OVERRIDE_UPDATE_LEAVE.
 *   APPROVED (non-HR)      → blocked: "Approved leave cannot be edited."
 *   IN_REVIEW / REJECTED / CANCELLED / CANCEL_REQUESTED → blocked.
 *   Start date in the past → only HR/ADMIN may edit.
 *
 * Throws LeaveServiceError on any violation.
 */
export async function updateLeave(
  callerId: string,
  callerIsAdmin: boolean,
  leaveId: string,
  input: UpdateLeaveInput
): Promise<void> {
  const {
    leaveTypeId, leaveStartDateTime, leaveEndDateTime,
    totalDays, reason, documentUrl,
  } = input

  const callerIsPrivileged = isPrivileged(callerIsAdmin)

  // ── Load existing leave request (with old leave type for balance adjustment) ─
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    select: {
      userId:              true,
      status:              true,
      leaveStartDateTime:  true,
      leaveEndDateTime:    true,
      leaveTypeId:         true,
      totalDays:           true,
      leaveType: {
        select: { name: true, deductFromBalance: true },
      },
    },
  })

  if (!leave) {
    throw new LeaveServiceError('ไม่พบคำขอลา')
  }

  // ── Ownership: owner or HR/ADMIN ──────────────────────────────────────────
  if (leave.userId !== callerId && !callerIsPrivileged) {
    throw new LeaveServiceError('คุณไม่มีสิทธิ์แก้ไขคำขอลานี้')
  }

  // ── Status gate ───────────────────────────────────────────────────────────
  if (leave.status === LeaveStatus.PENDING) {
    throw new LeaveServiceError(
      'Cannot edit pending leave. Please cancel and reapply.'
    )
  }
  if (leave.status === LeaveStatus.APPROVED) {
    if (!callerIsPrivileged) {
      throw new LeaveServiceError('Approved leave cannot be edited.')
    }
    // HR/ADMIN override path — handled separately below
  } else if (leave.status !== LeaveStatus.DRAFT) {
    // IN_REVIEW, REJECTED, CANCELLED, CANCEL_REQUESTED — all blocked
    throw new LeaveServiceError(
      `ไม่สามารถแก้ไขคำขอลาที่มีสถานะ "${leave.status}" ได้`
    )
  }

  // ── Past-date gate: only HR/ADMIN may touch past leave ────────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const leaveStart = new Date(leave.leaveStartDateTime)
  leaveStart.setHours(0, 0, 0, 0)

  if (leaveStart < today && !callerIsPrivileged) {
    throw new LeaveServiceError(
      'ไม่สามารถแก้ไขคำขอลาที่ผ่านวันเริ่มต้นแล้ว กรุณาติดต่อ HR'
    )
  }

  // ── Load new leave type ───────────────────────────────────────────────────
  const newLeaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } })
  if (!newLeaveType) {
    throw new LeaveServiceError('ไม่พบประเภทการลา', 'leaveTypeId')
  }

  // ════════════════════════════════════════════════════════════════════════════
  // HR OVERRIDE PATH — edit an APPROVED leave
  // Bypasses normal policy checks (quota, attachment) since this is an
  // administrative correction.  Balance is adjusted: restore old, deduct new.
  // ════════════════════════════════════════════════════════════════════════════
  if (leave.status === LeaveStatus.APPROVED) {
    const oldLeaveTypeId  = leave.leaveTypeId
    const oldTotalDays    = leave.totalDays
    const oldDeducts      = leave.leaveType.deductFromBalance
    const newDeducts      = newLeaveType.deductFromBalance
    const oldYear         = new Date(leave.leaveStartDateTime).getFullYear()
    const newYear         = leaveStartDateTime.getFullYear()

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Restore balance for the old approved leave
      if (oldDeducts) {
        await tx.leaveBalance.updateMany({
          where: { userId: leave.userId, leaveTypeId: oldLeaveTypeId, year: oldYear },
          data:  { usedDays: { decrement: oldTotalDays } },
        })
      }

      // 2. Apply new leave fields
      await tx.leaveRequest.update({
        where: { id: leaveId },
        data:  {
          leaveTypeId,
          leaveStartDateTime,
          leaveEndDateTime,
          totalDays,
          reason:      reason || null,
          documentUrl: documentUrl || null,
          // Status stays APPROVED — HR correction, not a re-approval
        },
      })

      // 3. Deduct balance for the new adjusted leave
      if (newDeducts) {
        await tx.leaveBalance.updateMany({
          where: { userId: leave.userId, leaveTypeId, year: newYear },
          data:  { usedDays: { increment: totalDays } },
        })
      }

      // 4. Mandatory HR override audit log
      await tx.auditLog.create({
        data: {
          userId:      callerId,
          action:      'HR_OVERRIDE_UPDATE_LEAVE',
          entityType:  'LeaveRequest',
          entityId:    leaveId,
          description:
            `[Admin OVERRIDE] Edited approved leave: ` +
            `${leave.leaveType.name} → ${newLeaveType.name}, ` +
            `${oldTotalDays} → ${totalDays} day(s)` +
            (oldDeducts || newDeducts ? ` | balance adjusted` : ''),
        },
      })

      // 5. Field-level change log
      await logLeaveFieldChanges(tx, leaveId, callerId, [
        leaveFieldChange.leaveTypeId(oldLeaveTypeId, leaveTypeId),
        leaveFieldChange.leaveStartDateTime(leave.leaveStartDateTime, leaveStartDateTime),
        leaveFieldChange.leaveEndDateTime(leave.leaveEndDateTime, leaveEndDateTime),
      ])

    })

    return
  }

  // ════════════════════════════════════════════════════════════════════════════
  // NORMAL PATH — edit a DRAFT leave (owner or HR/ADMIN)
  // Full policy checks apply.
  // ════════════════════════════════════════════════════════════════════════════
  const leaveType = newLeaveType

  // ── Policy: maxDaysPerRequest ─────────────────────────────────────────────
  if (leaveType.maxDaysPerRequest !== null && totalDays > leaveType.maxDaysPerRequest) {
    const msg = `เกินจำนวนวันลาสูงสุดต่อครั้ง: "${leaveType.name}" อนุญาตสูงสุด ${leaveType.maxDaysPerRequest} วัน (ขอลา ${totalDays} วัน)`
    await logPolicyRejection(callerId, msg)
    throw new LeaveServiceError(msg)
  }

  // ── Policy: maxDaysPerYear ────────────────────────────────────────────────
  if (leaveType.maxDaysPerYear !== null) {
    const used = await getUsedLeaveDaysThisYear(leave.userId, leaveTypeId)
    const remaining = leaveType.maxDaysPerYear - used
    if (used + totalDays > leaveType.maxDaysPerYear) {
      const msg = `เกินสิทธิ์ลาประจำปี "${leaveType.name}" (ใช้ไปแล้ว ${used} วัน / สูงสุด ${leaveType.maxDaysPerYear} วัน · คงเหลือ ${remaining} วัน)`
      await logPolicyRejection(callerId, msg)
      throw new LeaveServiceError(msg)
    }
  }

  // ── Policy: requiresAttachment ────────────────────────────────────────────
  if (leaveType.requiresAttachment && !documentUrl) {
    throw new LeaveServiceError(
      `ประเภทการลา "${leaveType.name}" จำเป็นต้องแนบเอกสารประกอบ`,
      'documentUrl'
    )
  }

  // ── Transaction: balance check + update ──────────────────────────────────
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const year = leaveStartDateTime.getFullYear()

    if (leaveType.deductFromBalance) {
      const balance = await tx.leaveBalance.findUnique({
        where: { userId_leaveTypeId_year: { userId: leave.userId, leaveTypeId, year } },
      })
      const remaining = (balance?.totalDays ?? 0) - (balance?.usedDays ?? 0)
      if (totalDays > remaining) {
        throw new Error(
          `สิทธิ์การลาไม่เพียงพอ (คงเหลือ ${remaining} วัน แต่ขอลา ${totalDays} วัน)`
        )
      }
    }

    await tx.leaveRequest.update({
      where: { id: leaveId },
      data: {
        leaveTypeId,
        leaveStartDateTime,
        leaveEndDateTime,
        totalDays,
        reason:      reason || null,
        documentUrl: documentUrl || null,
      },
    })

    await tx.auditLog.create({
      data: {
        userId:      callerId,
        action:      'UPDATE_LEAVE_DRAFT',
        entityType:  'LeaveRequest',
        entityId:    leaveId,
        description: `Leave draft updated by ${callerIsPrivileged ? 'Admin' : 'owner'}: ${leaveType.name} — ${totalDays} day(s)`,
      },
    })

    await logLeaveFieldChanges(tx, leaveId, callerId, [
      leaveFieldChange.leaveTypeId(leave.leaveTypeId, leaveTypeId),
      leaveFieldChange.leaveStartDateTime(leave.leaveStartDateTime, leaveStartDateTime),
      leaveFieldChange.leaveEndDateTime(leave.leaveEndDateTime, leaveEndDateTime),
    ])
  })
}

/**
 * Submit a DRAFT leave request → status transitions to PENDING.
 * Assigns an approver and sends notification.
 * Throws LeaveServiceError if the leave is not in DRAFT status.
 */
export async function submitLeave(
  userId: string,
  leaveId: string
): Promise<void> {
  // ── Load the leave request (must belong to caller) ────────────────────────
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    include: {
      leaveType: { select: { name: true } },
      user: {
        select: {
          name: true,
          employee: { select: { managerId: true, approvers: { select: { userId: true } } } },
        },
      },
    },
  })

  if (!leave) {
    throw new LeaveServiceError('ไม่พบคำขอลา')
  }
  if (leave.userId !== userId) {
    throw new LeaveServiceError('คุณไม่มีสิทธิ์ดำเนินการนี้')
  }
  if (leave.status !== LeaveStatus.DRAFT) {
    throw new LeaveServiceError(
      `ไม่สามารถส่งคำขอลานี้ได้ (สถานะปัจจุบัน: ${leave.status})`
    )
  }

  const approverTarget = await resolveApproverTarget(leave.user.employee)

  // Transition DRAFT → PENDING
  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data: { status: LeaveStatus.PENDING },
  })

  await prisma.auditLog.create({
    data: {
      userId,
      action: 'SUBMIT_LEAVE_REQUEST',
      entityType: 'LeaveRequest',
      entityId: leaveId,
      description: `Leave request submitted: ${leave.leaveType.name} — ${leave.totalDays} day(s)`,
    },
  })

  await logLeaveFieldChanges(prisma, leaveId, userId, [
    leaveFieldChange.status('DRAFT', 'PENDING'),
  ])

  // Assign approver + notify all recipients
  if (approverTarget) {
    // Remove any previous approval records for this draft (safety)
    await prisma.approval.deleteMany({ where: { leaveRequestId: leaveId } })

    await prisma.approval.create({
      data: {
        leaveRequestId: leaveId,
        approverId:     approverTarget.approverId,
        level: 1,
        status: ApprovalStatus.PENDING,
      },
    })

    // Fire-and-forget email to approvers + all admins
    void (async () => {
      try {
        const [approverRows, adminRows] = await Promise.all([
          prisma.user.findMany({
            where:  { id: { in: approverTarget.notifyIds } },
            select: { email: true },
          }),
          prisma.user.findMany({
            where:  { isActive: true, role: { name: { in: ['ADMIN', 'HR'] } } },
            select: { email: true },
          }),
        ])

        const recipients = [
          ...new Set([
            ...approverRows.map((u) => u.email),
            ...adminRows.map((u) => u.email),
          ]),
        ].filter((e): e is string => !!e)

        if (recipients.length > 0) {
          const { subject, html, text } = buildLeaveRequestEmail({
            employeeName:       leave.user.name ?? '',
            leaveTypeName:      leave.leaveType.name,
            totalDays:          leave.totalDays,
            leaveStartDateTime: leave.leaveStartDateTime,
            leaveEndDateTime:   leave.leaveEndDateTime,
            reason:             leave.reason,
            leaveRequestId:     leaveId,
          })
          await sendMail({ to: recipients, subject, html, text })
        }
      } catch (err) {
        console.error('[submitLeave] email notification failed:', err)
      }
    })()
  }
}
/**
 * Hard-delete a DRAFT leave request.
 * Only the owner may do this. Removes LeaveAuditLog and Approval children first
 * (no cascade in schema), then deletes the LeaveRequest itself.
 */
export async function deleteDraftLeave(
  callerId: string,
  leaveId: string
): Promise<void> {
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    select: { userId: true, status: true },
  })

  if (!leave) throw new LeaveServiceError('ไม่พบคำขอลา')
  if (leave.userId !== callerId) throw new LeaveServiceError('คุณไม่มีสิทธิ์ลบคำขอลานี้')
  if (leave.status !== LeaveStatus.DRAFT) throw new LeaveServiceError('ลบได้เฉพาะร่างเท่านั้น')

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.leaveAuditLog.deleteMany({ where: { leaveId } })
    await tx.approval.deleteMany({ where: { leaveRequestId: leaveId } })
    await tx.leaveRequest.delete({ where: { id: leaveId } })
  })
}

/**
 * Cancel a leave request.
 *
 * Status transition rules:
 *
 *   DRAFT / PENDING / IN_REVIEW
 *     → Owner OR HR/ADMIN: CANCELLED  (no balance restore — deduction never occurred)
 *
 *   APPROVED
 *     → Owner (non-HR/ADMIN): CANCEL_REQUESTED  (flags leave for HR to review)
 *                              + notifies all HR users
 *     → HR / ADMIN: CANCELLED immediately + restore balance if deductFromBalance
 *
 *   CANCEL_REQUESTED
 *     → HR / ADMIN: CANCELLED + restore balance  (approving the pending cancel)
 *     → Owner: throw — already awaiting HR review
 *
 *   REJECTED / CANCELLED
 *     → throw — already in a terminal state
 *
 * Throws LeaveServiceError on any rule violation.
 */
export async function cancelLeave(
  callerId: string,
  callerIsAdmin: boolean,
  leaveId: string
): Promise<{ requestedCancellation: boolean }> {
  const callerIsPrivileged = isPrivileged(callerIsAdmin)

  // ── Load leave request ────────────────────────────────────────────────────
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    select: {
      userId:              true,
      status:              true,
      totalDays:           true,
      leaveStartDateTime:  true,
      leaveEndDateTime:    true,
      reason:              true,
      leaveTypeId:         true,
      leaveType: {
        select: {
          name:             true,
          deductFromBalance: true,
        },
      },
      user: {
        select: { name: true, email: true },
      },
    },
  })

  if (!leave) {
    throw new LeaveServiceError('ไม่พบคำขอลา')
  }

  // ── Ownership ─────────────────────────────────────────────────────────────
  if (leave.userId !== callerId && !callerIsPrivileged) {
    throw new LeaveServiceError('คุณไม่มีสิทธิ์ยกเลิกคำขอลานี้')
  }

  const { status } = leave

  // ── Terminal states — no action possible ─────────────────────────────────
  if (status === LeaveStatus.REJECTED) {
    throw new LeaveServiceError('คำขอลาที่ถูกปฏิเสธไม่สามารถยกเลิกได้')
  }
  if (status === LeaveStatus.CANCELLED) {
    throw new LeaveServiceError('คำขอลานี้ถูกยกเลิกไปแล้ว')
  }

  // ── CANCEL_REQUESTED — only HR/ADMIN may proceed ──────────────────────────
  if (status === LeaveStatus.CANCEL_REQUESTED) {
    if (!callerIsPrivileged) {
      throw new LeaveServiceError(
        'คำขอยกเลิกอยู่ระหว่างรอการพิจารณาจาก HR กรุณารอการดำเนินการ'
      )
    }
    // HR/ADMIN confirms cancellation → restore balance only if leave was ever APPROVED
    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data:  { status: LeaveStatus.CANCELLED },
    })

    const wasApproved = await prisma.leaveAuditLog.findFirst({
      where: { leaveId, fieldChanged: 'status', newValue: 'APPROVED' },
    })
    if (wasApproved) {
      await restoreBalance(prisma, leave.userId, leave.leaveTypeId, leave.leaveStartDateTime, leave.totalDays)
    }

    await prisma.auditLog.create({
      data: {
        userId:      callerId,
        action:      'HR_OVERRIDE_CANCEL_LEAVE',
        entityType:  'LeaveRequest',
        entityId:    leaveId,
        description: `[Admin OVERRIDE] Approved cancellation request: ${leave.leaveType.name} — ${leave.totalDays} day(s) restored`,
      },
    })

    await logLeaveFieldChanges(prisma, leaveId, callerId, [
      leaveFieldChange.status('CANCEL_REQUESTED', 'CANCELLED'),
    ])

    // Notify employee that their cancellation request was approved
    void (async () => {
      try {
        const employeeEmail = leave.user.email
        if (employeeEmail) {
          const { subject, html, text } = buildLeaveCancelApprovedEmail({
            employeeName:       leave.user.name ?? '',
            leaveTypeName:      leave.leaveType.name,
            totalDays:          leave.totalDays,
            leaveStartDateTime: leave.leaveStartDateTime,
            leaveEndDateTime:   leave.leaveEndDateTime,
            leaveRequestId:     leaveId,
          })
          await sendMail({ to: employeeEmail, subject, html, text })
        }
      } catch (err) {
        console.error('[cancelLeave] cancel-confirmed email failed:', err)
      }
    })()

    return { requestedCancellation: false }
  }

  // ── APPROVED — non-privileged owner cannot cancel; only HR/admin may ───────────
  if (status === LeaveStatus.APPROVED && !callerIsPrivileged) {
    throw new LeaveServiceError('คำขอลาที่อนุมัติแล้วไม่สามารถยกเลิกเองได้ กรุณาติดต่อ HR หรือ Admin')
  }

  // ── PENDING / IN_REVIEW — non-privileged owner → request cancellation ───────────────
  if (
    !callerIsPrivileged &&
    (status === LeaveStatus.PENDING ||
     status === LeaveStatus.IN_REVIEW)
  ) {
    await prisma.leaveRequest.update({
      where: { id: leaveId },
      data:  { status: LeaveStatus.CANCEL_REQUESTED },
    })

    await prisma.auditLog.create({
      data: {
        userId:      callerId,
        action:      'REQUEST_CANCEL_LEAVE',
        entityType:  'LeaveRequest',
        entityId:    leaveId,
        description: `Employee requested cancellation of leave: ${leave.leaveType.name} — ${leave.totalDays} day(s) (was ${status})`,
      },
    })

    await logLeaveFieldChanges(prisma, leaveId, callerId, [
      leaveFieldChange.status(status, 'CANCEL_REQUESTED'),
    ])

    // Fire-and-forget email to admins/HR + assigned approver
    void (async () => {
      try {
        const [approverRows, adminRows] = await Promise.all([
          prisma.approval.findMany({
            where:  { leaveRequestId: leaveId },
            select: { approver: { select: { email: true } } },
          }),
          prisma.user.findMany({
            where:  { isActive: true, role: { name: { in: ['ADMIN', 'HR'] } } },
            select: { email: true },
          }),
        ])
        const recipients = [
          ...new Set([
            ...approverRows.map((a) => a.approver.email),
            ...adminRows.map((u) => u.email),
          ]),
        ].filter((e): e is string => !!e)
        if (recipients.length > 0) {
          const { subject, html, text } = buildLeaveCancelRequestEmail({
            employeeName:       leave.user.name ?? '',
            leaveTypeName:      leave.leaveType.name,
            totalDays:          leave.totalDays,
            leaveStartDateTime: leave.leaveStartDateTime,
            leaveEndDateTime:   leave.leaveEndDateTime,
            reason:             leave.reason,
            leaveRequestId:     leaveId,
          })
          await sendMail({ to: recipients, subject, html, text })
        }
      } catch (err) {
        console.error('[cancelLeave] cancel-request email failed:', err)
      }
    })()

    return { requestedCancellation: true }
  }

  // ── HR/ADMIN → immediate cancellation + balance restore ────────
  // Handles: PENDING, IN_REVIEW, APPROVED, DRAFT
  const needsBalanceRestore = status === LeaveStatus.APPROVED
  const auditAction = status === LeaveStatus.APPROVED
    ? 'HR_OVERRIDE_CANCEL_LEAVE'
    : 'CANCEL_LEAVE'

  await prisma.leaveRequest.update({
    where: { id: leaveId },
    data:  { status: LeaveStatus.CANCELLED },
  })

  if (needsBalanceRestore) {
    await restoreBalance(prisma, leave.userId, leave.leaveTypeId, leave.leaveStartDateTime, leave.totalDays)
  }

  await prisma.auditLog.create({
    data: {
      userId:      callerId,
      action:      auditAction,
      entityType:  'LeaveRequest',
      entityId:    leaveId,
      description: (status === LeaveStatus.APPROVED
        ? `[Admin OVERRIDE] Cancelled approved leave`
        : `Leave cancelled (status was ${status})`) +
        `: ${leave.leaveType.name} — ${leave.totalDays} day(s)` +
        (needsBalanceRestore ? ' [balance restored]' : ''),
    },
  })

  await logLeaveFieldChanges(prisma, leaveId, callerId, [
    leaveFieldChange.status(status, 'CANCELLED'),
  ])

  // Notify employee that HR/Admin cancelled their leave
  void (async () => {
    try {
      const employeeEmail = leave.user.email
      if (employeeEmail) {
        const { subject, html, text } = buildLeaveCancelApprovedEmail({
          employeeName:       leave.user.name ?? '',
          leaveTypeName:      leave.leaveType.name,
          totalDays:          leave.totalDays,
          leaveStartDateTime: leave.leaveStartDateTime,
          leaveEndDateTime:   leave.leaveEndDateTime,
          leaveRequestId:     leaveId,
        })
        await sendMail({ to: employeeEmail, subject, html, text })
      }
    } catch (err) {
      console.error('[cancelLeave] cancel-notify-employee email failed:', err)
    }
  })()

  return { requestedCancellation: false }
}

// ── Private: restore leave balance ───────────────────────────────────────────

type BalanceClient = { leaveBalance: Prisma.TransactionClient['leaveBalance'] }

async function restoreBalance(
  tx: BalanceClient,
  userId: string,
  leaveTypeId: string,
  leaveStartDateTime: Date,
  totalDays: number
): Promise<void> {
  const year = new Date(leaveStartDateTime).getFullYear()
  await tx.leaveBalance.updateMany({
    where: {
      userId,
      leaveTypeId,
      year,
    },
    data: {
      usedDays: { decrement: totalDays },
    },
  })
}