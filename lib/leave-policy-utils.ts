/**
 * Pure (no-DB) leave policy utilities — safe to import in client components.
 */

export type LeaveTypePolicy = {
  id: string
  name: string
  maxDaysPerYear: number | null
  maxDaysPerRequest: number | null
  requiresAttachment: boolean
  deductFromBalance: boolean
  allowDuringProbation: boolean
}

/**
 * Build a concise Thai-language policy summary for display in the form.
 * Examples:
 *   "ไม่เกิน 30 วันต่อปี · ไม่หักสิทธิ์"
 *   "ไม่เกิน 12 วันต่อปี · ไม่อนุญาตช่วงทดลองงาน"
 */
export function buildPolicySummary(lt: LeaveTypePolicy): string {
  const parts: string[] = []

  if (lt.maxDaysPerYear !== null) {
    parts.push(`ไม่เกิน ${lt.maxDaysPerYear} วันต่อปี`)
  }
  if (lt.maxDaysPerRequest !== null) {
    parts.push(`ไม่เกิน ${lt.maxDaysPerRequest} วันต่อครั้ง`)
  }
  if (lt.requiresAttachment) {
    parts.push('ต้องแนบเอกสาร')
  }
  if (!lt.deductFromBalance) {
    parts.push('ไม่หักสิทธิ์')
  }
  if (!lt.allowDuringProbation) {
    parts.push('ไม่อนุญาตช่วงทดลองงาน')
  }

  return parts.length > 0 ? parts.join(' · ') : 'ไม่มีเงื่อนไขพิเศษ'
}
