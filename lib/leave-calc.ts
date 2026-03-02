/**
 * Shared leave day calculation logic.
 * Used by both the client-side preview and the server action (never trust the client).
 *
 * Rules:
 *  - Same day + FULL_DAY                       -> 1
 *  - Same day + half-day (any)                 -> 0.5
 *  - Multi-day: count working days (Mon-Fri),
 *    then subtract 0.5 if startDurationType is half-day,
 *    and subtract 0.5 if endDurationType is half-day.
 *    (Allows e.g. 3-day leave starting half-day and ending half-day = 2 days)
 */

export type LeaveDurationType = 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON'

export interface CalculationResult {
  totalDays: number
  error?: string
}

export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  startDurationType: LeaveDurationType,
  endDurationType: LeaveDurationType = startDurationType
): CalculationResult {
  const start = new Date(startDate)
  const end = new Date(endDate)
  start.setHours(0, 0, 0, 0)
  end.setHours(0, 0, 0, 0)

  if (end < start) {
    return { totalDays: 0, error: 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น' }
  }

  const isSameDay = start.getTime() === end.getTime()

  if (isSameDay) {
    const day = start.getDay()
    if (day === 0 || day === 6) {
      return { totalDays: 0, error: 'ไม่สามารถลาในวันหยุดสุดสัปดาห์ได้' }
    }
    return { totalDays: startDurationType === 'FULL_DAY' ? 1 : 0.5 }
  }

  // Count working days (Mon-Fri) inclusive
  let workingDays = 0
  const cursor = new Date(start)
  while (cursor <= end) {
    const d = cursor.getDay()
    if (d !== 0 && d !== 6) workingDays++
    cursor.setDate(cursor.getDate() + 1)
  }

  if (workingDays === 0) {
    return { totalDays: 0, error: 'ช่วงวันที่เลือกไม่มีวันทำการ' }
  }

  // Adjust for partial start / end days
  let total = workingDays
  if (startDurationType !== 'FULL_DAY') total -= 0.5
  if (endDurationType !== 'FULL_DAY') total -= 0.5

  if (total <= 0) {
    return { totalDays: 0, error: 'จำนวนวันลาต้องมากกว่า 0' }
  }

  return { totalDays: total }
}

/** Display label for LeaveDurationType */
export function durationLabel(type: LeaveDurationType): string {
  switch (type) {
    case 'FULL_DAY':
      return 'เต็มวัน'
    case 'HALF_DAY_MORNING':
      return 'ครึ่งวันเช้า'
    case 'HALF_DAY_AFTERNOON':
      return 'ครึ่งวันบ่าย'
  }
}

