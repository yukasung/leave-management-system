/**
 * Shared leave duration calculation logic (datetime-based).
 * Used by both the client-side live preview and the server action.
 *
 * Working hours: 08:00 – 17:00 (lunch 12:00 – 13:00 excluded)
 * Net working hours per day: 8 h
 *
 * totalDays is stored as a fraction of a working day (1.0 = 8 h).
 * Display helpers convert back to human-readable form.
 *
 * Public holidays are supplied as a Set of "YYYY-MM-DD" strings.
 * When omitted (client preview), only weekends are skipped.
 * The server-side calculation always passes the Set.
 */

// ── Working-hour constants ────────────────────────────────────────────────────

export const WORK_START_HOUR  = 9   // 09:30
export const WORK_START_MIN   = 30
export const WORK_END_HOUR    = 17  // 17:30
export const WORK_END_MIN     = 30
export const LUNCH_START_HOUR = 12  // 12:00
export const LUNCH_END_HOUR   = 13  // 13:00
export const WORK_HOURS_PER_DAY = 7 // effective after lunch deduction (9:30–17:30 = 8 h – 1 h lunch = 7 h)

export interface CalculationResult {
  totalDays: number
  totalHours: number
  displayLabel: string
  error?: string
}

// ── Private helpers ───────────────────────────────────────────────────────────

/** Clamp minutes between 0 and max. */
function clampMin(value: number) {
  return value < 0 ? 0 : value
}

/**
 * Working minutes for a single calendar day between [dayStart, dayEnd] minutes-since-midnight,
 * excluding the lunch window [LUNCH_START*60, LUNCH_END*60).
 */
function workingMinutesForWindow(startMin: number, endMin: number): number {
  const workStart  = WORK_START_HOUR * 60 + WORK_START_MIN
  const workEnd    = WORK_END_HOUR   * 60 + WORK_END_MIN
  const lunchStart = LUNCH_START_HOUR * 60
  const lunchEnd   = LUNCH_END_HOUR   * 60

  // Clamp window to working hours
  const s = Math.max(startMin, workStart)
  const e = Math.min(endMin,   workEnd)
  if (e <= s) return 0

  // Subtract lunch overlap
  const lunchOverlap = clampMin(Math.min(e, lunchEnd) - Math.max(s, lunchStart))
  return e - s - lunchOverlap
}

/**
 * "YYYY-MM-DD" key from a LOCAL-time Date (matches datetime-local form input strings).
 * Used inside calculateLeaveDuration so that the working-hours window is
 * computed in the server/browser's local timezone, not UTC.
 */
function localDateKey(d: Date): string {
  const y   = d.getFullYear()
  const m   = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * "YYYY-MM-DD" key from a UTC-based Date cursor.
 * Used by countWorkingDays (which receives UTC-midnight dates).
 */
function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// ── Exported helpers ──────────────────────────────────────────────────────────

/**
 * Count Mon-Fri working days between start and end (inclusive), skipping any
 * dates present in `publicHolidays` (a Set of "YYYY-MM-DD" strings).
 *
 * All comparisons are done in UTC to avoid timezone-shift bugs.
 * (Kept for backward-compat with other callers.)
 */
export function countWorkingDays(
  start: Date,
  end: Date,
  publicHolidays: Set<string> = new Set()
): number {
  let count = 0
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()))
  const endNorm = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()))

  while (cursor <= endNorm) {
    const dow = cursor.getUTCDay()
    if (dow !== 0 && dow !== 6 && !publicHolidays.has(utcDateKey(cursor))) {
      count++
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
}

/**
 * Format a totalDays value (fraction of a working day) as a human-readable string.
 *
 * ≥ 1 day  → "X วันทำการ"
 * < 1 day  → convert to hours → "X ชั่วโมง" (or "X.X ชั่วโมง")
 */
export function formatLeaveDuration(totalDays: number): string {
  if (totalDays >= 1) {
    // Show as integer or one decimal
    const rounded = Math.round(totalDays * 10) / 10
    return `${rounded} วันทำการ`
  }
  const hours = totalDays * WORK_HOURS_PER_DAY
  const roundedH = Math.round(hours * 10) / 10
  return `${roundedH} ชั่วโมง`
}

/**
 * Calculate leave duration counting every calendar day (including weekends
 * and public holidays). Used for Maternity Leave (ลาคลอดบุตร).
 *
 * The result uses the same CalculationResult shape as calculateLeaveDuration.
 * totalDays = full calendar days elapsed (end date - start date + 1).
 * totalHours = totalDays * 24 (used for display only).
 */
export function calculateCalendarDays(
  startDT: Date,
  endDT:   Date,
): CalculationResult {
  const startDay = new Date(startDT.getFullYear(), startDT.getMonth(), startDT.getDate())
  const endDay   = new Date(endDT.getFullYear(),   endDT.getMonth(),   endDT.getDate())

  if (endDay < startDay) {
    return { totalDays: 0, totalHours: 0, displayLabel: '', error: 'เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น' }
  }

  const msPerDay = 24 * 60 * 60 * 1000
  const totalDays = Math.round((endDay.getTime() - startDay.getTime()) / msPerDay) + 1

  return {
    totalDays,
    totalHours: totalDays * 24,
    displayLabel: `${totalDays} วันปฏิทิน`,
  }
}

// ── Main export (pure — no DB) ────────────────────────────────────────────────

/**
 * Calculate leave duration from two datetime values.
 *
 * - Iterates each calendar day in the range.
 * - Skips weekends and public holidays.
 * - Per day, counts working minutes inside [08:00, 17:00) excluding lunch.
 * - Returns totalDays (fraction, 1.0 = 8 h), totalHours, and a display label.
 *
 * For the authoritative server-side version that also skips CompanyHoliday
 * rows, use `calculateLeaveDurationServer` from `lib/leave-calc-server.ts`.
 */
export function calculateLeaveDuration(
  startDT: Date,
  endDT:   Date,
  publicHolidays: Set<string> = new Set()
): CalculationResult {
  if (endDT <= startDT) {
    return {
      totalDays: 0, totalHours: 0,
      displayLabel: '',
      error: 'เวลาสิ้นสุดต้องหลังเวลาเริ่มต้น',
    }
  }

  // Calendar-day boundaries using LOCAL time — datetime-local inputs are parsed
  // as local time by new Date(), so we must NOT use UTC methods here.
  const startDateLocal = new Date(startDT.getFullYear(), startDT.getMonth(), startDT.getDate())
  const endDateLocal   = new Date(endDT.getFullYear(),   endDT.getMonth(),   endDT.getDate())

  // Minutes-since-midnight in LOCAL time
  const startMinOfDay = startDT.getHours() * 60 + startDT.getMinutes()
  const endMinOfDay   = endDT.getHours()   * 60 + endDT.getMinutes()

  let totalWorkingMinutes = 0

  const cursor = new Date(startDateLocal)

  while (cursor <= endDateLocal) {
    const dow = cursor.getDay()         // local day-of-week (0 = Sun, 6 = Sat)
    const key = localDateKey(cursor)    // "YYYY-MM-DD" in local time

    if (dow !== 0 && dow !== 6 && !publicHolidays.has(key)) {
      const isFirstDay = cursor.getTime() === startDateLocal.getTime()
      const isLastDay  = cursor.getTime() === endDateLocal.getTime()
      const isSameDay  = isFirstDay && isLastDay

      const dayStartMin = isFirstDay ? startMinOfDay : WORK_START_HOUR * 60 + WORK_START_MIN
      const dayEndMin   = isLastDay  ? endMinOfDay   : WORK_END_HOUR   * 60 + WORK_END_MIN

      if (isSameDay) {
        totalWorkingMinutes += workingMinutesForWindow(startMinOfDay, endMinOfDay)
      } else {
        totalWorkingMinutes += workingMinutesForWindow(dayStartMin, dayEndMin)
      }
    }

    cursor.setDate(cursor.getDate() + 1)
  }

  if (totalWorkingMinutes <= 0) {
    return {
      totalDays: 0, totalHours: 0,
      displayLabel: '',
      error: 'ไม่มีเวลาทำการในช่วงที่เลือก (อาจเป็นวันหยุด, นอกเวลาทำงาน หรือช่วงเวลาพักกลางวัน)',
    }
  }

  const totalHours = totalWorkingMinutes / 60
  const totalDays  = totalHours / WORK_HOURS_PER_DAY

  return {
    totalDays,
    totalHours,
    displayLabel: formatLeaveDuration(totalDays),
  }
}

