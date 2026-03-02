/**
 * Leave Request Service — business logic only.
 * No HTTP/form parsing here.  Controllers (server actions) call these functions.
 */
import 'server-only'

import { prisma } from './prisma'
import { getUsedLeaveDaysThisYear } from './leave-policy'
import type { LeaveDurationType } from './leave-calc'
import { Prisma, LeaveStatus, ApprovalStatus } from '@prisma/client'

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
  userId:             string
  leaveTypeId:        string
  startDate:          Date
  endDate:            Date
  startDurationType:  LeaveDurationType
  endDurationType:    LeaveDurationType
  totalDays:          number
  reason:             string | null
  documentUrl:        string | null
}

export type CreateLeaveResult = {
  leaveRequestId: string
}

export type UpdateLeaveInput = {
  leaveTypeId:        string
  startDate:          Date
  endDate:            Date
  startDurationType:  LeaveDurationType
  endDurationType:    LeaveDurationType
  totalDays:          number
  reason:             string | null
  documentUrl:        string | null
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

async function resolveApproverId(
  employee: { managerId: string | null } | null | undefined
): Promise<string | null> {
  if (employee?.managerId) return employee.managerId

  // Fallback: first HR user by creation order
  const hr = await prisma.user.findFirst({
    where: { role: 'HR' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  return hr?.id ?? null
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
    userId, leaveTypeId, startDate, endDate,
    startDurationType, endDurationType, totalDays,
    reason, documentUrl,
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
      isProbation: true,
      name: true,
      employee: { select: { managerId: true } },
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
  if (requestingUser?.isProbation && !leaveType.allowDuringProbation) {
    const msg = `ไม่สามารถลา "${leaveType.name}" ได้ในช่วงทดลองงาน`
    await logPolicyRejection(userId, msg)
    throw new LeaveServiceError(msg)
  }

  // ── Transaction: balance check + create DRAFT ─────────────────────────────
  const leaveRequest = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const year = startDate.getFullYear()

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
        startDate,
        endDate,
        startDurationType,
        endDurationType,
        totalDays,
        reason: reason || null,
        documentUrl: documentUrl || null,
        status: 'DRAFT',
      },
    })

    await tx.auditLog.create({
      data: {
        userId,
        action: 'CREATE_LEAVE_DRAFT',
        entityType: 'LeaveRequest',
        entityId: req.id,
        description: `Leave draft created: ${leaveType.name} — ${totalDays} day(s) [start:${startDurationType} end:${endDurationType}]`,
      },
    })

    return req
  })

  return { leaveRequestId: leaveRequest.id }
}

/**
 * Edit a leave request's fields.
 *
 * Rules:
 *   DRAFT     → full edit allowed.
 *   PENDING   → blocked: "Cannot edit pending leave. Please cancel and reapply."
 *   APPROVED  → blocked: "Approved leave cannot be edited."
 *   Any other status (IN_REVIEW, REJECTED, CANCELLED) → blocked.
 *   Start date already in the past → only HR / ADMIN may update.
 *
 * Throws LeaveServiceError on any violation.
 */
export async function updateLeave(
  callerId: string,
  callerRole: string,
  leaveId: string,
  input: UpdateLeaveInput
): Promise<void> {
  const {
    leaveTypeId, startDate, endDate,
    startDurationType, endDurationType, totalDays,
    reason, documentUrl,
  } = input

  // ── Load existing leave request ───────────────────────────────────────────
  const leave = await prisma.leaveRequest.findUnique({
    where: { id: leaveId },
    select: {
      userId:      true,
      status:      true,
      startDate:   true,
      leaveTypeId: true,
      totalDays:   true,
    },
  })

  if (!leave) {
    throw new LeaveServiceError('ไม่พบคำขอลา')
  }

  // ── Ownership: only the owner (or HR/ADMIN) can edit ──────────────────────
  const isPrivileged = callerRole === 'HR' || callerRole === 'ADMIN'
  if (leave.userId !== callerId && !isPrivileged) {
    throw new LeaveServiceError('คุณไม่มีสิทธิ์แก้ไขคำขอลานี้')
  }

  // ── Status gate ───────────────────────────────────────────────────────────
  if (leave.status === LeaveStatus.PENDING) {
    throw new LeaveServiceError(
      'Cannot edit pending leave. Please cancel and reapply.'
    )
  }
  if (leave.status === LeaveStatus.APPROVED) {
    throw new LeaveServiceError('Approved leave cannot be edited.')
  }
  if (leave.status !== LeaveStatus.DRAFT) {
    // IN_REVIEW, REJECTED, CANCELLED — all blocked for editing
    throw new LeaveServiceError(
      `ไม่สามารถแก้ไขคำขอลาที่มีสถานะ "${leave.status}" ได้`
    )
  }

  // ── Past-date gate: only HR / ADMIN may touch past leave ─────────────────
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const leaveStart = new Date(leave.startDate)
  leaveStart.setHours(0, 0, 0, 0)

  if (leaveStart < today && !isPrivileged) {
    throw new LeaveServiceError(
      'ไม่สามารถแก้ไขคำขอลาที่ผ่านวันเริ่มต้นแล้ว กรุณาติดต่อ HR'
    )
  }

  // ── Load new leave type ───────────────────────────────────────────────────
  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } })
  if (!leaveType) {
    throw new LeaveServiceError('ไม่พบประเภทการลา', 'leaveTypeId')
  }

  // ── Policy: maxDaysPerRequest ─────────────────────────────────────────────
  if (leaveType.maxDaysPerRequest !== null && totalDays > leaveType.maxDaysPerRequest) {
    const msg = `เกินจำนวนวันลาสูงสุดต่อครั้ง: "${leaveType.name}" อนุญาตสูงสุด ${leaveType.maxDaysPerRequest} วัน (ขอลา ${totalDays} วัน)`
    await logPolicyRejection(callerId, msg)
    throw new LeaveServiceError(msg)
  }

  // ── Policy: maxDaysPerYear (exclude this leave's own existing total) ───────
  if (leaveType.maxDaysPerYear !== null) {
    const used = await getUsedLeaveDaysThisYear(leave.userId, leaveTypeId)
    // Days previously counted for this request are already excluded because
    // status is DRAFT (getUsedLeaveDaysThisYear only counts APPROVED).
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

  // ── Transaction: balance check (if type changed) + update ────────────────
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const year = startDate.getFullYear()

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
        startDate,
        endDate,
        startDurationType,
        endDurationType,
        totalDays,
        reason: reason || null,
        documentUrl: documentUrl || null,
      },
    })

    await tx.auditLog.create({
      data: {
        userId:      callerId,
        action:      'UPDATE_LEAVE_DRAFT',
        entityType:  'LeaveRequest',
        entityId:    leaveId,
        description: `Leave draft updated by ${isPrivileged ? callerRole : 'owner'}: ${leaveType.name} — ${totalDays} day(s) [start:${startDurationType} end:${endDurationType}]`,
      },
    })
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
          employee: { select: { managerId: true } },
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

  const approverId = await resolveApproverId(leave.user.employee)

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Transition DRAFT → PENDING
    await tx.leaveRequest.update({
      where: { id: leaveId },
      data: { status: LeaveStatus.PENDING },
    })

    await tx.auditLog.create({
      data: {
        userId,
        action: 'SUBMIT_LEAVE_REQUEST',
        entityType: 'LeaveRequest',
        entityId: leaveId,
        description: `Leave request submitted: ${leave.leaveType.name} — ${leave.totalDays} day(s)`,
      },
    })

    // Assign approver + notify
    if (approverId) {
      // Remove any previous approval records for this draft (safety)
      await tx.approval.deleteMany({ where: { leaveRequestId: leaveId } })

      await tx.approval.create({
        data: {
          leaveRequestId: leaveId,
          approverId,
          level: 1,
          status: ApprovalStatus.PENDING,
        },
      })

      await tx.notification.create({
        data: {
          userId: approverId,
          message: `New leave request: ${leave.leaveType.name} by ${leave.user.name} (${leave.totalDays} day${leave.totalDays !== 1 ? 's' : ''})`,
          isRead: false,
        },
      })
    }
  })
}
