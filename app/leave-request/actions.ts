'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { calculateLeaveDays, type LeaveDurationType } from '@/lib/leave-calc'
import { getUsedLeaveDaysThisYear } from '@/lib/leave-policy'

export type FormState = {
  success?: boolean
  message?: string
  errors?: {
    leaveTypeId?: string
    startDate?: string
    endDate?: string
    durationType?: string
    documentUrl?: string
    reason?: string
    general?: string
  }
}

// ── Policy rejection audit log (outside transaction — no leave request yet) ────
async function logPolicyRejection(userId: string, reason: string): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'POLICY_REJECTION',
        entityType: 'LeaveRequest',
        entityId: 'N/A',
        description: `Leave request rejected by policy: ${reason}`,
      },
    })
  } catch {
    // Non-critical — do not surface to user
  }
}

const VALID_DURATION_TYPES: LeaveDurationType[] = [
  'FULL_DAY',
  'HALF_DAY_MORNING',
  'HALF_DAY_AFTERNOON',
]

export async function createLeaveRequest(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { errors: { general: 'กรุณาเข้าสู่ระบบก่อน' } }
  }

  const leaveTypeId = formData.get('leaveTypeId') as string
  const startDateStr = formData.get('startDate') as string
  const endDateStr = formData.get('endDate') as string
  const durationTypeRaw = (formData.get('durationType') as string) || 'FULL_DAY'
  const reason = formData.get('reason') as string
  const documentUrl = (formData.get('documentUrl') as string) || null

  // ── Basic presence validation ────────────────────────────
  const errors: FormState['errors'] = {}
  if (!leaveTypeId) errors.leaveTypeId = 'กรุณาเลือกประเภทการลา'
  if (!startDateStr) errors.startDate = 'กรุณาเลือกวันที่เริ่มต้น'
  if (!endDateStr) errors.endDate = 'กรุณาเลือกวันที่สิ้นสุด'
  if (!VALID_DURATION_TYPES.includes(durationTypeRaw as LeaveDurationType)) {
    errors.durationType = 'ประเภทช่วงเวลาไม่ถูกต้อง'
  }
  if (Object.keys(errors).length > 0) return { errors }

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)
  const durationType = durationTypeRaw as LeaveDurationType

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  if (startDate < today) {
    return { errors: { startDate: 'วันที่เริ่มต้นต้องไม่เป็นวันที่ผ่านมาแล้ว' } }
  }

  // ── Server-side recalculation (never trust the client) ─────
  const isSameDay = startDate.getTime() === endDate.getTime()

  // Reject if multi-day with non-FULL_DAY (server-side safety check)
  if (!isSameDay && durationType !== 'FULL_DAY') {
    return { errors: { general: 'การลาหลายวันต้องเลือก "เต็มวัน" เท่านั้น' } }
  }

  const calc = calculateLeaveDays(startDate, endDate, durationType)
  if (calc.error) {
    return { errors: { general: calc.error } }
  }

  const totalDays = calc.totalDays

  // ── Policy checks (read-only queries before transaction) ────────────────────
  const leaveType = await prisma.leaveType.findUnique({ where: { id: leaveTypeId } })
  if (!leaveType) {
    return { errors: { leaveTypeId: 'ไม่พบประเภทการลา' } }
  }

  // 1. maxDaysPerRequest
  if (leaveType.maxDaysPerRequest !== null && totalDays > leaveType.maxDaysPerRequest) {
    const msg = `เกินจำนวนวันลาสูงสุดต่อครั้ง: "${leaveType.name}" อนุญาตสูงสุด ${leaveType.maxDaysPerRequest} วัน (ขอลา ${totalDays} วัน)`
    await logPolicyRejection(session.user.id, msg)
    return { errors: { general: msg } }
  }

  // 2. maxDaysPerYear
  if (leaveType.maxDaysPerYear !== null) {
    const usedThisYear = await getUsedLeaveDaysThisYear(session.user.id, leaveTypeId)
    const remaining = leaveType.maxDaysPerYear - usedThisYear
    if (usedThisYear + totalDays > leaveType.maxDaysPerYear) {
      const msg = `เกินสิทธิ์ลาประจำปี "${leaveType.name}" (ใช้ไปแล้ว ${usedThisYear} วัน / สูงสุด ${leaveType.maxDaysPerYear} วัน · คงเหลือ ${remaining} วัน)`
      await logPolicyRejection(session.user.id, msg)
      return { errors: { general: msg } }
    }
  }

  // 3. requiresAttachment
  if (leaveType.requiresAttachment && !documentUrl) {
    return {
      errors: { documentUrl: `ประเภทการลา "${leaveType.name}" จำเป็นต้องแนบเอกสารประกอบ` },
    }
  }

  // 4. Probation
  const requestingUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      isProbation: true,
      name: true,
      department: { select: { managerId: true } },
      employee: {
        select: {
          managerId: true,
        },
      },
    },
  })
  if (requestingUser?.isProbation && !leaveType.allowDuringProbation) {
    const msg = `ไม่สามารถลา "${leaveType.name}" ได้ในช่วงทดลองงาน`
    await logPolicyRejection(session.user.id, msg)
    return { errors: { general: msg } }
  }

  // ── Resolve approver: Employee manager → fallback HR ──────────────────────
  // Priority: Employee.managerId (= User.id) > Department.managerId > first HR user
  let approverId: string | null =
    requestingUser?.employee?.managerId ?? null

  if (!approverId) {
    // Fallback to first HR user
    const hrUser = await prisma.user.findFirst({
      where: { role: 'HR' },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    })
    approverId = hrUser?.id ?? null
  }

  // ── Transaction: balance check + create ─────────────────────────────────────
  try {
    await prisma.$transaction(async (tx) => {
      const year = startDate.getFullYear()

      // 5. Balance check — only for leave types that deduct from balance
      if (leaveType.deductFromBalance) {
        const balance = await tx.leaveBalance.findUnique({
          where: {
            userId_leaveTypeId_year: {
              userId: session.user.id,
              leaveTypeId,
              year,
            },
          },
        })

        const remaining = (balance?.totalDays ?? 0) - (balance?.usedDays ?? 0)
        if (totalDays > remaining) {
          throw new Error(
            `สิทธิ์การลาไม่เพียงพอ (คงเหลือ ${remaining} วัน แต่ขอลา ${totalDays} วัน)`
          )
        }
      }

      const leaveRequest = await tx.leaveRequest.create({
        data: {
          userId: session.user.id,
          leaveTypeId,
          startDate,
          endDate,
          durationType,
          totalDays,
          reason: reason || null,
          documentUrl: documentUrl || null,
          status: 'PENDING',
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE_LEAVE_REQUEST',
          entityType: 'LeaveRequest',
          entityId: leaveRequest.id,
          description: `Employee submitted leave request: ${leaveType.name} — ${totalDays} day(s) [${durationType}]`,
        },
      })

      // Assign approver and notify
      if (approverId) {
        await tx.approval.create({
          data: {
            leaveRequestId: leaveRequest.id,
            approverId,
            level: 1,
            status: 'PENDING',
          },
        })

        await tx.notification.create({
          data: {
            userId: approverId,
            message: `New leave request: ${leaveType.name} by ${requestingUser!.name} (${totalDays} day${totalDays !== 1 ? 's' : ''})`,
            isRead: false,
          },
        })
      }
    })

    revalidatePath('/leave-request')
    revalidatePath('/my-leaves')
    return { success: true, message: `ส่งคำขอลา "${leaveType.name}" ${totalDays} วันทำการเรียบร้อยแล้ว` }
  } catch (e) {
    const message =
      e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    return { errors: { general: message } }
  }
}

