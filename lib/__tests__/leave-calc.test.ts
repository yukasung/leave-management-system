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

/** Convenience: full-day leave (08:00 → 17:00) on possibly multiple days */
function fullRange(startIso: string, endIso: string): [Date, Date] {
  return [dt(startIso, '08:00'), dt(endIso, '17:00')]
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
  it('returns 1 day for a single weekday 08:00–17:00', () => {
    // 2026-01-05 is Monday
    const [s, e] = fullRange('2026-01-05', '2026-01-05')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(1)
    expect(res.error).toBeUndefined()
  })

  it('returns 5 days for Mon–Fri 08:00–17:00', () => {
    const [s, e] = fullRange('2026-01-05', '2026-01-09')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(5)
  })

  it('returns error for leave entirely on a weekend', () => {
    // 2026-01-10 (Sat) 08:00 → 2026-01-10 17:00
    const [s, e] = fullRange('2026-01-10', '2026-01-10')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBe(0)
    expect(res.error).toBeDefined()
  })
})

describe('calculateLeaveDuration — partial days (time-based)', () => {
  it('returns 0.5 for a morning half-day (08:00–12:00)', () => {
    // 4 working hours out of 8 = 0.5 days
    const s = dt('2026-01-05', '08:00')
    const e = dt('2026-01-05', '12:00')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(0.5)
  })

  it('returns 0.5 for an afternoon half-day (13:00–17:00)', () => {
    const s = dt('2026-01-05', '13:00')
    const e = dt('2026-01-05', '17:00')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(0.5)
  })

  it('excludes lunch hour (12:00–13:00) from the calculation', () => {
    // 08:00–17:00 = 8 working hours (lunch excluded) = 1 day
    const s = dt('2026-01-05', '08:00')
    const e = dt('2026-01-05', '17:00')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(1)
    expect(res.totalHours).toBeCloseTo(8)
  })

  it('returns 0.125 for a one-hour leave (08:00–09:00)', () => {
    // 1/8 of a working day
    const s = dt('2026-01-05', '08:00')
    const e = dt('2026-01-05', '09:00')
    const res = calculateLeaveDuration(s, e)
    expect(res.totalDays).toBeCloseTo(0.125)
    expect(res.totalHours).toBeCloseTo(1)
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
