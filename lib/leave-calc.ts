/**
 * Shared leave day calculation logic.
 * Used by both the client-side preview and the server action (never trust the client).
 *
 * Rules:
 *  - Same day + FULL_DAY                       -> 1
 *  - Same day + half-day (any)                 -> 0.5
 *  - Multi-day: count working days (Mon-Fri), skipping public holidays,
 *    then subtract 0.5 if startDurationType is half-day,
 *    and subtract 0.5 if endDurationType is half-day.
 *    (Allows e.g. 3-day leave starting half-day and ending half-day = 2 days)
 *
 * Public holidays are supplied as a Set of "YYYY-MM-DD" strings.
 * When the Set is omitted (client preview), only weekends are skipped.
 * The authoritative server-side calculation always passes the Set
 * (see lib/leave-calc-server.ts).
 */

export type LeaveDurationType = 'FULL_DAY' | 'HALF_DAY_MORNING' | 'HALF_DAY_AFTERNOON'

export interface CalculationResult {
  totalDays: number
  error?: string
}

// ── Pure helper ───────────────────────────────────────────────────────────────

/**
 * Count Mon-Fri working days between start and end (inclusive), skipping any
 * dates present in `publicHolidays` (a Set of "YYYY-MM-DD" strings).
 *
 * All comparisons are done in UTC to avoid timezone-shift bugs.
 */
export function countWorkingDays(
  start: Date,
  end: Date,
  publicHolidays: Set<string> = new Set()
): number {
  let count = 0

  // Normalise to UTC midnight so toISOString() slice matches the holiday Set keys
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  const endNorm = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))

  while (cursor <= endNorm) {
    const dow = cursor.getUTCDay() // 0 = Sun, 6 = Sat
    if (dow !== 0 && dow !== 6) {
      const key = cursor.toISOString().slice(0, 10) // "YYYY-MM-DD"
      if (!publicHolidays.has(key)) {
        count++
      }
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return count
}

// ── Main export (pure — no DB) ────────────────────────────────────────────────

/**
 * Calculate leave days without DB lookup (used for client-side live preview).
 * For the authoritative server-side calculation that skips public holidays,
 * use `calculateLeaveDaysServer` from `lib/leave-calc-server.ts`.
 */
export function calculateLeaveDays(
  startDate: Date,
  endDate: Date,
  startDurationType: LeaveDurationType,
  endDurationType: LeaveDurationType = startDurationType,
  publicHolidays: Set<string> = new Set()
): CalculationResult {
  // Normalise to UTC midnight
  const start = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()))
  const end   = new Date(Date.UTC(endDate.getUTCFullYear(),   endDate.getUTCMonth(),   endDate.getUTCDate()))

  if (end < start) {
    return { totalDays: 0, error: 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น' }
  }

  const isSameDay = start.getTime() === end.getTime()

  if (isSameDay) {
    const dow = start.getUTCDay()
    if (dow === 0 || dow === 6) {
      return { totalDays: 0, error: 'ไม่สามารถลาในวันหยุดสุดสัปดาห์ได้' }
    }
    const key = start.toISOString().slice(0, 10)
    if (publicHolidays.has(key)) {
      return { totalDays: 0, error: 'วันที่เลือกตรงกับวันหยุดนักขัตฤกษ์' }
    }
    return { totalDays: startDurationType === 'FULL_DAY' ? 1 : 0.5 }
  }

  // Count working days (Mon-Fri, skipping public holidays) inclusive
  const workingDays = countWorkingDays(start, end, publicHolidays)

  if (workingDays === 0) {
    return { totalDays: 0, error: 'ช่วงวันที่เลือกไม่มีวันทำการ (อาจเป็นวันหยุดหรือวันหยุดนักขัตฤกษ์ทั้งหมด)' }
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

