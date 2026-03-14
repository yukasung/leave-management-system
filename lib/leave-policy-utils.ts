/**
 * Pure (no-DB) leave policy utilities — safe to import in client components.
 */

export type LeaveCategory  = 'ANNUAL' | 'EVENT'
export type LeaveLimitType = 'PER_YEAR' | 'PER_EVENT' | 'MEDICAL_BASED'
export type DayCountType   = 'WORKING_DAY' | 'CALENDAR_DAY'

export type LeaveTypePolicy = {
  id: string
  name: string
  leaveCategory:       LeaveCategory
  leaveLimitType:      LeaveLimitType
  dayCountType:        DayCountType
  maxDaysPerYear: number | null
  maxDaysPerRequest: number | null
  requiresAttachment: boolean
  deductFromBalance: boolean
  allowDuringProbation: boolean
}

/** Human-readable Thai labels */
export const LEAVE_CATEGORY_LABEL: Record<LeaveCategory, string> = {
  ANNUAL: 'ลาประจำปี',
  EVENT:  'ลาพิเศษ',
}

export const LEAVE_LIMIT_TYPE_LABEL: Record<LeaveLimitType, string> = {
  PER_YEAR:      'ต่อปี',
  PER_EVENT:     'ต่อครั้ง',
  MEDICAL_BASED: 'ตามใบรับรองแพทย์',
}

export const DAY_COUNT_TYPE_LABEL: Record<DayCountType, string> = {
  WORKING_DAY:  'วันทำการ',
  CALENDAR_DAY: 'วันปฏิทิน',
}

/**
 * Build a concise Thai-language policy summary for display in the form.
 * Examples:
 *   "ลาประจำปี · ไม่เกิน 30 วันต่อปี · วันทำการ"
 *   "ลาตามเหตุการณ์ · ไม่เกิน 98 วันต่อครั้ง · วันปฏิทิน"
 */
export function buildPolicySummary(lt: LeaveTypePolicy): string {
  const parts: string[] = []

  parts.push(LEAVE_CATEGORY_LABEL[lt.leaveCategory])

  if (lt.maxDaysPerYear !== null) {
    parts.push(`ไม่เกิน ${lt.maxDaysPerYear} วัน${LEAVE_LIMIT_TYPE_LABEL[lt.leaveLimitType]}`)
  } else if (lt.maxDaysPerRequest !== null) {
    parts.push(`ไม่เกิน ${lt.maxDaysPerRequest} วัน${LEAVE_LIMIT_TYPE_LABEL[lt.leaveLimitType]}`)
  } else if (lt.leaveLimitType === 'MEDICAL_BASED') {
    parts.push('ตามใบรับรองแพทย์')
  }

  parts.push(DAY_COUNT_TYPE_LABEL[lt.dayCountType])

  if (lt.requiresAttachment) parts.push('ต้องแนบเอกสาร')
  if (!lt.deductFromBalance) parts.push('ไม่หักสิทธิ์')
  if (!lt.allowDuringProbation) parts.push('ไม่อนุญาตช่วงทดลองงาน')

  return parts.join(' · ')
}
