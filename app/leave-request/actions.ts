'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { calculateLeaveDurationServer } from '@/lib/leave-calc-server'
import {
  createDraft,
  submitLeave,
  updateLeave,
  cancelLeave,
  deleteDraftLeave,
  LeaveServiceError,
} from '@/lib/leave-request.service'

// ── Shared form state type ────────────────────────────────────────────────────

export type FormState = {
  success?: boolean
  message?: string
  leaveRequestId?: string
  errors?: {
    leaveTypeId?: string
    leaveStartDateTime?: string
    leaveEndDateTime?: string
    documentUrl?: string
    reason?: string
    general?: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM-DDTHH:mm" (local form value) into a UTC Date. */
function parseDateTimeLocal(str: string): Date | null {
  // HTML datetime-local gives "YYYY-MM-DDTHH:mm"
  if (!str) return null
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

// ── Action: save form as DRAFT ────────────────────────────────────────────────

export async function createLeaveRequest(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { errors: { general: 'กรุณาเข้าสู่ระบบก่อน' } }
  }

  // ── Parse raw fields ──────────────────────────────────────────────────────
  const leaveTypeId      = formData.get('leaveTypeId')           as string
  const startStr         = formData.get('leaveStartDateTime')    as string
  const endStr           = formData.get('leaveEndDateTime')      as string
  const reason           = formData.get('reason')                as string | null
  const documentUrl      = (formData.get('documentUrl')          as string) || null

  // ── Presence validation ───────────────────────────────────────────────────
  const errors: FormState['errors'] = {}
  if (!leaveTypeId)  errors.leaveTypeId         = 'กรุณาเลือกประเภทการลา'
  if (!startStr)     errors.leaveStartDateTime  = 'กรุณาระบุวันและเวลาเริ่มต้น'
  if (!endStr)       errors.leaveEndDateTime    = 'กรุณาระบุวันและเวลาสิ้นสุด'
  if (Object.keys(errors).length > 0) return { errors }

  const leaveStartDateTime = parseDateTimeLocal(startStr)
  const leaveEndDateTime   = parseDateTimeLocal(endStr)

  if (!leaveStartDateTime) return { errors: { leaveStartDateTime: 'รูปแบบวันที่/เวลาไม่ถูกต้อง' } }
  if (!leaveEndDateTime)   return { errors: { leaveEndDateTime:   'รูปแบบวันที่/เวลาไม่ถูกต้อง' } }

  // Must be in the future (start date must be today or later)
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startDay = new Date(leaveStartDateTime.getFullYear(), leaveStartDateTime.getMonth(), leaveStartDateTime.getDate())
  if (startDay < todayMidnight) {
    return { errors: { leaveStartDateTime: 'วันที่เริ่มต้นต้องไม่เป็นวันที่ผ่านมาแล้ว' } }
  }

  // ── Check for overlapping leave requests ─────────────────────────────────
  const overlapping = await prisma.leaveRequest.findFirst({
    where: {
      userId: session.user.id,
      status: { notIn: ['DRAFT', 'REJECTED', 'CANCELLED'] },
      leaveStartDateTime: { lte: leaveEndDateTime },
      leaveEndDateTime:   { gte: leaveStartDateTime },
    },
  })
  if (overlapping) {
    return { errors: { general: 'คุณมีคำขอลาในช่วงเวลาดังกล่าวอยู่แล้ว กรุณาตรวจสอบอีกครั้ง' } }
  }

  // ── Fetch dayCountType for the selected leave type ───────────────────────
  const leaveTypeRecord = await prisma.leaveType.findUnique({
    where: { id: leaveTypeId },
    select: { dayCountType: true },
  })
  const dayCountType = leaveTypeRecord?.dayCountType ?? 'WORKING_DAY'

  // ── Server-side recalculation — respects dayCountType ────────────────────
  const calc = await calculateLeaveDurationServer(leaveStartDateTime, leaveEndDateTime, dayCountType)
  if (calc.error) {
    return { errors: { general: calc.error } }
  }

  // ── Delegate to service layer ─────────────────────────────────────────────
  try {
    const { leaveRequestId } = await createDraft({
      userId: session.user.id,
      leaveTypeId,
      leaveStartDateTime,
      leaveEndDateTime,
      totalDays: calc.totalDays,
      reason: reason || null,
      documentUrl,
    })

    await submitLeave(session.user.id, leaveRequestId)

    revalidatePath('/leave-request')
    revalidatePath('/my-leaves')

    return {
      success: true,
      message: 'ส่งคำขอลาเรียบร้อยแล้ว รอการอนุมัติ',
    }
  } catch (e) {
    if (e instanceof LeaveServiceError) {
      const field = e.field as keyof NonNullable<FormState['errors']> | undefined
      return field
        ? { errors: { [field]: e.message } }
        : { errors: { general: e.message } }
    }
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    return { errors: { general: message } }
  }
}

// ── Action: hard-delete a DRAFT leave request ────────────────────────────────

export type DeleteDraftState = {
  success?: boolean
  message?: string
  error?: string
}

export async function deleteDraftLeaveRequest(leaveId: string): Promise<DeleteDraftState> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'กรุณาเข้าสู่ระบบก่อน' }

  try {
    await deleteDraftLeave(session.user.id, leaveId)
    revalidatePath('/leave-request')
    revalidatePath('/my-leaves')
    return { success: true, message: 'ลบร่างเรียบร้อยแล้ว' }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    return { error: message }
  }
}

// ── Action: cancel or request cancellation of a leave request ─────────────────

export type CancelState = {
  success?: boolean
  requestedCancellation?: boolean   // true when APPROVED → CANCEL_REQUESTED
  message?: string
  error?: string
}

export async function cancelLeaveRequest(leaveId: string): Promise<CancelState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'กรุณาเข้าสู่ระบบก่อน' }
  }

  try {
    const { requestedCancellation } = await cancelLeave(
      session.user.id,
      session.user.isAdmin,
      leaveId
    )

    revalidatePath('/leave-request')
    revalidatePath('/my-leaves')
    revalidatePath('/hr/leave-requests')
    revalidatePath('/manager/leave-requests')

    if (requestedCancellation) {
      return {
        success: true,
        requestedCancellation: true,
        message: 'ส่งคำขอยกเลิกเรียบร้อยแล้ว อยู่ระหว่างรอ HR พิจารณา',
      }
    }

    return { success: true, message: 'ยกเลิกคำขอลาเรียบร้อยแล้ว' }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    return { error: message }
  }
}
// ── Action: submit DRAFT → PENDING ───────────────────────────────────────────

export type SubmitState = {
  success?: boolean
  message?: string
  error?: string
}

export async function submitLeaveRequest(leaveId: string): Promise<SubmitState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'กรุณาเข้าสู่ระบบก่อน' }
  }

  try {
    await submitLeave(session.user.id, leaveId)

    revalidatePath('/leave-request')
    revalidatePath('/my-leaves')

    return { success: true, message: 'ส่งคำขอแล้ว รอการอนุมัติ' }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    return { error: message }
  }
}

// ── Action: update a DRAFT leave request ─────────────────────────────────────

export async function updateLeaveRequest(
  leaveId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { errors: { general: 'กรุณาเข้าสู่ระบบก่อน' } }
  }

  // ── Parse raw fields ──────────────────────────────────────────────────────
  const leaveTypeId  = formData.get('leaveTypeId')           as string
  const startStr     = formData.get('leaveStartDateTime')    as string
  const endStr       = formData.get('leaveEndDateTime')      as string
  const reason       = formData.get('reason')                as string | null
  const documentUrl  = (formData.get('documentUrl')          as string) || null

  // ── Presence validation ───────────────────────────────────────────────────
  const errors: FormState['errors'] = {}
  if (!leaveTypeId)  errors.leaveTypeId         = 'กรุณาเลือกประเภทการลา'
  if (!startStr)     errors.leaveStartDateTime  = 'กรุณาระบุวันและเวลาเริ่มต้น'
  if (!endStr)       errors.leaveEndDateTime    = 'กรุณาระบุวันและเวลาสิ้นสุด'
  if (Object.keys(errors).length > 0) return { errors }

  const leaveStartDateTime = parseDateTimeLocal(startStr)
  const leaveEndDateTime   = parseDateTimeLocal(endStr)

  if (!leaveStartDateTime) return { errors: { leaveStartDateTime: 'รูปแบบวันที่/เวลาไม่ถูกต้อง' } }
  if (!leaveEndDateTime)   return { errors: { leaveEndDateTime:   'รูปแบบวันที่/เวลาไม่ถูกต้อง' } }

  // ── Fetch dayCountType for the selected leave type ───────────────────────
  const leaveTypeRecord = await prisma.leaveType.findUnique({
    where: { id: leaveTypeId },
    select: { dayCountType: true },
  })
  const dayCountType = leaveTypeRecord?.dayCountType ?? 'WORKING_DAY'

  // ── Server-side recalculation — respects dayCountType ────────────────────
  const calc = await calculateLeaveDurationServer(leaveStartDateTime, leaveEndDateTime, dayCountType)
  if (calc.error) {
    return { errors: { general: calc.error } }
  }

  // ── Delegate to service (all status / date / policy checks live there) ─────
  try {
    await updateLeave(
      session.user.id,
      session.user.isAdmin,
      leaveId,
      {
        leaveTypeId,
        leaveStartDateTime,
        leaveEndDateTime,
        totalDays: calc.totalDays,
        reason: reason || null,
        documentUrl,
      }
    )

    revalidatePath('/leave-request')
    revalidatePath('/my-leaves')

    return { success: true, message: 'อัปเดตคำขอลาเรียบร้อยแล้ว' }
  } catch (e) {
    if (e instanceof LeaveServiceError) {
      const field = e.field as keyof NonNullable<FormState['errors']> | undefined
      return field
        ? { errors: { [field]: e.message } }
        : { errors: { general: e.message } }
    }
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    return { errors: { general: message } }
  }
}
