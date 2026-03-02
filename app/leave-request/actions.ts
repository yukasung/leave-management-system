'use server'

import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { calculateLeaveDays, type LeaveDurationType } from '@/lib/leave-calc'
import {
  createDraft,
  submitLeave,
  updateLeave,
  LeaveServiceError,
} from '@/lib/leave-request.service'

// ── Shared form state type ────────────────────────────────────────────────────

export type FormState = {
  success?: boolean
  message?: string
  leaveRequestId?: string
  errors?: {
    leaveTypeId?: string
    startDate?: string
    endDate?: string
    startDurationType?: string
    endDurationType?: string
    documentUrl?: string
    reason?: string
    general?: string
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_DURATION_TYPES: LeaveDurationType[] = [
  'FULL_DAY',
  'HALF_DAY_MORNING',
  'HALF_DAY_AFTERNOON',
]

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
  const leaveTypeId          = formData.get('leaveTypeId')          as string
  const startDateStr         = formData.get('startDate')            as string
  const endDateStr           = formData.get('endDate')              as string
  const startDurationTypeRaw = (formData.get('startDurationType')   as string) || 'FULL_DAY'
  const endDurationTypeRaw   = (formData.get('endDurationType')     as string) || 'FULL_DAY'
  const reason               = formData.get('reason')               as string | null
  const documentUrl          = (formData.get('documentUrl')         as string) || null

  // ── Presence validation ───────────────────────────────────────────────────
  const errors: FormState['errors'] = {}
  if (!leaveTypeId) errors.leaveTypeId = 'กรุณาเลือกประเภทการลา'
  if (!startDateStr) errors.startDate  = 'กรุณาเลือกวันที่เริ่มต้น'
  if (!endDateStr)   errors.endDate    = 'กรุณาเลือกวันที่สิ้นสุด'
  if (!VALID_DURATION_TYPES.includes(startDurationTypeRaw as LeaveDurationType)) {
    errors.startDurationType = 'ประเภทช่วงเวลาวันแรกไม่ถูกต้อง'
  }
  if (!VALID_DURATION_TYPES.includes(endDurationTypeRaw as LeaveDurationType)) {
    errors.endDurationType = 'ประเภทช่วงเวลาวันสุดท้ายไม่ถูกต้อง'
  }
  if (Object.keys(errors).length > 0) return { errors }

  const startDate        = new Date(startDateStr)
  const endDate          = new Date(endDateStr)
  const startDurationType = startDurationTypeRaw as LeaveDurationType
  const endDurationType   = endDurationTypeRaw   as LeaveDurationType

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  if (startDate < today) {
    return { errors: { startDate: 'วันที่เริ่มต้นต้องไม่เป็นวันที่ผ่านมาแล้ว' } }
  }

  // ── Server-side recalculation (never trust the client) ────────────────────
  const calc = calculateLeaveDays(startDate, endDate, startDurationType, endDurationType)
  if (calc.error) {
    return { errors: { general: calc.error } }
  }

  // ── Delegate to service layer ─────────────────────────────────────────────
  try {
    const { leaveRequestId } = await createDraft({
      userId: session.user.id,
      leaveTypeId,
      startDate,
      endDate,
      startDurationType,
      endDurationType,
      totalDays: calc.totalDays,
      reason: reason || null,
      documentUrl,
    })

    revalidatePath('/leave-request')
    revalidatePath('/my-leaves')

    return {
      success: true,
      leaveRequestId,
      message: 'บันทึกร่างคำขอลาเรียบร้อยแล้ว กรุณากดยืนยันเพื่อส่งคำขอ',
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

    return { success: true, message: 'ส่งคำขอลาเรียบร้อยแล้ว อยู่ระหว่างรอการอนุมัติ' }
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
  const leaveTypeId          = formData.get('leaveTypeId')          as string
  const startDateStr         = formData.get('startDate')            as string
  const endDateStr           = formData.get('endDate')              as string
  const startDurationTypeRaw = (formData.get('startDurationType')   as string) || 'FULL_DAY'
  const endDurationTypeRaw   = (formData.get('endDurationType')     as string) || 'FULL_DAY'
  const reason               = formData.get('reason')               as string | null
  const documentUrl          = (formData.get('documentUrl')         as string) || null

  // ── Presence validation ───────────────────────────────────────────────────
  const errors: FormState['errors'] = {}
  if (!leaveTypeId) errors.leaveTypeId = 'กรุณาเลือกประเภทการลา'
  if (!startDateStr) errors.startDate  = 'กรุณาเลือกวันที่เริ่มต้น'
  if (!endDateStr)   errors.endDate    = 'กรุณาเลือกวันที่สิ้นสุด'
  if (!VALID_DURATION_TYPES.includes(startDurationTypeRaw as LeaveDurationType)) {
    errors.startDurationType = 'ประเภทช่วงเวลาวันแรกไม่ถูกต้อง'
  }
  if (!VALID_DURATION_TYPES.includes(endDurationTypeRaw as LeaveDurationType)) {
    errors.endDurationType = 'ประเภทช่วงเวลาวันสุดท้ายไม่ถูกต้อง'
  }
  if (Object.keys(errors).length > 0) return { errors }

  const startDate        = new Date(startDateStr)
  const endDate          = new Date(endDateStr)
  const startDurationType = startDurationTypeRaw as LeaveDurationType
  const endDurationType   = endDurationTypeRaw   as LeaveDurationType

  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  // ── Server-side recalculation ─────────────────────────────────────────────
  const calc = calculateLeaveDays(startDate, endDate, startDurationType, endDurationType)
  if (calc.error) {
    return { errors: { general: calc.error } }
  }

  // ── Delegate to service (all status / date / policy checks live there) ─────
  try {
    await updateLeave(
      session.user.id,
      session.user.role,
      leaveId,
      {
        leaveTypeId,
        startDate,
        endDate,
        startDurationType,
        endDurationType,
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
