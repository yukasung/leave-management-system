/**
 * Shared leave day calculation logic.
 * Used by both the client-side preview and the server action (never trust the client).
 *
 * Simplified rules:
 *  - Same day + FULL_DAY          -> 1
 *  - Same day + half-day option   -> 0.5
 *  - Multi-day                    -> count working days (Mon-Fri) as integer
 *  - Multi-day + non-FULL_DAY     -> rejected
 */

export type LeaveDurationType = 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON'

export interface CalculationResult {
  totalDays: number
  error?: string
}

export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  durationType: LeaveDurationType
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
    return { totalDays: durationType === 'FULL_DAY' ? 1 : 0.5 }
  }

  // Multi-day: half-day options are not allowed
  if (durationType !== 'FULL_DAY') {
    return {
      totalDays: 0,
      error: 'การลาหลายวันต้องเลือก "เต็มวัน" เท่านั้น',
    }
  }

  // Count working days (Mon-Fri)
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

  return { totalDays: workingDays }
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
