import { describe, it, expect } from 'vitest'
import {
  countWorkingDays,
  calculateLeaveDuration,
} from '../leave-calc'

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build a Date from "YYYY-MM-DD" at a specific local time (HH:mm).
 * Uses local time so the working-hours logic (08:00–17:00) lines up correctly.
 */
function dt(iso: string, hhmm = '08:00'): Date {
  return new Date(`${iso}T${hhmm}:00`)
}

/** Convenience: full-day leave (09:30 → 17:30) — matches actual WORK_START / WORK_END constants. */
function fullRange(startIso: string, endIso: string): [Date, Date] {
  return [dt(startIso, '09:30'), dt(endIso, '17:30')]
}

/** Build a UTC midnight Date from a "YYYY-MM-DD" string (avoids TZ surprises). */
function d(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

// ── countWorkingDays ─────────────────────────────────────────────────────────

describe('countWorkingDays', () => {
  it('counts Mon–Fri in a clean week (no holidays)', () => {
    // 2026-01-05 (Mon) to 2026-01-09 (Fri)
    expect(countWorkingDays(d('2026-01-05'), d('2026-01-09'))).toBe(5)
  })

  it('skips Saturday and Sunday', () => {
    // 2026-01-05 (Mon) to 2026-01-11 (Sun) → 5 working days
    expect(countWorkingDays(d('2026-01-05'), d('2026-01-11'))).toBe(5)
  })

  it('skips a public holiday in the middle of the week', () => {
    // Mon-Fri, Wednesday 2026-01-07 is a holiday → 4 working days
    const holidays = new Set(['2026-01-07'])
    expect(countWorkingDays(d('2026-01-05'), d('2026-01-09'), holidays)).toBe(4)
  })

  it('skips multiple public holidays', () => {
    // Mon-Fri, Mon and Fri are both holidays → 3 working days
    const holidays = new Set(['2026-01-05', '2026-01-09'])
    expect(countWorkingDays(d('2026-01-05'), d('2026-01-09'), holidays)).toBe(3)
  })

  it('returns 0 when entire range is holidays', () => {
    // A single Wednesday that is a holiday
    const holidays = new Set(['2026-01-07'])
    expect(countWorkingDays(d('2026-01-07'), d('2026-01-07'), holidays)).toBe(0)
  })

  it('returns 0 when range is a weekend', () => {
    // 2026-01-10 (Sat) to 2026-01-11 (Sun)
    expect(countWorkingDays(d('2026-01-10'), d('2026-01-11'))).toBe(0)
  })

  it('counts a single weekday as 1', () => {
    expect(countWorkingDays(d('2026-01-05'), d('2026-01-05'))).toBe(1)
  })

  it('returns 0 for a single weekday that is a public holiday', () => {
    const holidays = new Set(['2026-01-05'])
    expect(countWorkingDays(d('2026-01-05'), d('2026-01-05'), holidays)).toBe(0)
  })
})

// ── calculateLeaveDuration — basic cases ────────────────────────────────────

describe('calculateLeaveDuration — full days', () => {
  it('returns 1 day for a single weekday 09:30–17:30', () => {
    // 2026-01-05 is Monday; 09:30–17:30 = 7 working hours (lunch deducted) = 1 day
    const [s, e] = fullRange('2026-01-05', '2026-01-05')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(1)
    expect(res.error).toBeUndefined()
  })

  it('returns 5 days for Mon–Fri 09:30–17:30', () => {
    const [s, e] = fullRange('2026-01-05', '2026-01-09')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(5)
  })

  it('returns error for leave entirely on a weekend', () => {
    // 2026-01-10 (Sat) 09:30 → 17:30
    const [s, e] = fullRange('2026-01-10', '2026-01-10')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBe(0)
    expect(res.error).toBeDefined()
  })
})

describe('calculateLeaveDuration — partial days (time-based)', () => {
  it('returns ~0.357 for a morning session (09:30–12:00) = 2.5h / 7h', () => {
    // 09:30–12:00 = 2.5 working hours (no lunch overlap)
    const s = dt('2026-01-05', '09:30')
    const e = dt('2026-01-05', '12:00')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(2.5 / 7, 3)
    expect(res.totalHours).toBeCloseTo(2.5, 2)
  })

  it('returns ~0.643 for an afternoon session (13:00–17:30) = 4.5h / 7h', () => {
    const s = dt('2026-01-05', '13:00')
    const e = dt('2026-01-05', '17:30')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(4.5 / 7, 3)
    expect(res.totalHours).toBeCloseTo(4.5, 2)
  })

  it('excludes lunch hour (12:00–13:00) — full day 09:30–17:30 = 7h = 1 day', () => {
    const s = dt('2026-01-05', '09:30')
    const e = dt('2026-01-05', '17:30')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(1)
    expect(res.totalHours).toBeCloseTo(7)
  })

  it('returns ~0.143 for a one-hour leave (09:30–10:30) = 1h / 7h', () => {
    const s = dt('2026-01-05', '09:30')
    const e = dt('2026-01-05', '10:30')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(1 / 7, 3)
    expect(res.totalHours).toBeCloseTo(1, 2)
  })
})

describe('calculateLeaveDuration — public holidays', () => {
  it('deducts one public holiday from a 5-day range', () => {
    const holidays = new Set(['2026-01-07']) // Wednesday
    const [s, e] = fullRange('2026-01-05', '2026-01-09')
    const res = calculateLeaveDuration(s, e, holidays)
    expect(res.totalDays).toBeCloseTo(4)
    expect(res.error).toBeUndefined()
  })

  it('returns error when all workdays in range are public holidays', () => {
    const holidays = new Set(['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09'])
    const [s, e] = fullRange('2026-01-05', '2026-01-09')
    const res = calculateLeaveDuration(s, e, holidays)
    expect(res.totalDays).toBe(0)
    expect(res.error).toBeDefined()
  })

  it('holiday on weekend does NOT affect the working-day count', () => {
    const holidays = new Set(['2026-01-10']) // Saturday
    const [s, e] = fullRange('2026-01-05', '2026-01-09')
    const res = calculateLeaveDuration(s, e, holidays)
    expect(res.totalDays).toBeCloseTo(5)
  })

  it('leave spanning two weeks with a holiday each week', () => {
    // 2026-01-05 (Mon) → 2026-01-16 (Fri) = 10 working days
    // Holidays on Wed wk1 + Wed wk2 → 8 working days
    const holidays = new Set(['2026-01-07', '2026-01-14'])
    const [s, e] = fullRange('2026-01-05', '2026-01-16')
    const res = calculateLeaveDuration(s, e, holidays)
    expect(res.totalDays).toBeCloseTo(8)
  })
})
