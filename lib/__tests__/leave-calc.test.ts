import { describe, it, expect } from 'vitest'
import {
  countWorkingDays,
  calculateLeaveDays,
  type LeaveDurationType,
} from '../leave-calc'

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a UTC midnight Date from a "YYYY-MM-DD" string (avoids TZ surprises). */
function d(iso: string): Date {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day))
}

const FULL: LeaveDurationType = 'FULL_DAY'
const MORNING: LeaveDurationType = 'HALF_DAY_MORNING'
const AFTERNOON: LeaveDurationType = 'HALF_DAY_AFTERNOON'

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

// ── calculateLeaveDays — pure (no holidays) ──────────────────────────────────

describe('calculateLeaveDays — weekend guard', () => {
  it('returns error for single-day leave on Saturday', () => {
    const res = calculateLeaveDays(d('2026-01-10'), d('2026-01-10'), FULL)
    expect(res.totalDays).toBe(0)
    expect(res.error).toBeDefined()
  })

  it('returns 1 for a single weekday FULL_DAY', () => {
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-05'), FULL)
    expect(res.totalDays).toBe(1)
    expect(res.error).toBeUndefined()
  })

  it('returns 0.5 for a single weekday HALF_DAY', () => {
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-05'), MORNING)
    expect(res.totalDays).toBe(0.5)
  })

  it('returns 5 for a full Mon–Fri week', () => {
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-09'), FULL)
    expect(res.totalDays).toBe(5)
  })

  it('deducts 0.5 for half-day start', () => {
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-09'), MORNING, FULL)
    expect(res.totalDays).toBe(4.5)
  })

  it('deducts 0.5 for half-day end', () => {
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-09'), FULL, AFTERNOON)
    expect(res.totalDays).toBe(4.5)
  })

  it('deducts 1 total for half-day start + half-day end', () => {
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-09'), MORNING, AFTERNOON)
    expect(res.totalDays).toBe(4)
  })
})

// ── calculateLeaveDays — with public holidays ────────────────────────────────

describe('calculateLeaveDays — public holiday deduction', () => {
  // Reference week: Mon 2026-01-05 → Fri 2026-01-09

  it('deducts one public holiday from a 5-day leave', () => {
    // Wednesday 2026-01-07 is a public holiday → should be 4 days
    const holidays = new Set(['2026-01-07'])
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-09'), FULL, FULL, holidays)
    expect(res.totalDays).toBe(4)
    expect(res.error).toBeUndefined()
  })

  it('deducts two public holidays from a 5-day leave', () => {
    // Mon and Fri are holidays → 3 working days remain
    const holidays = new Set(['2026-01-05', '2026-01-09'])
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-09'), FULL, FULL, holidays)
    expect(res.totalDays).toBe(3)
  })

  it('holiday on weekend does NOT affect the working-day count', () => {
    // Saturday 2026-01-10 is listed as a holiday — irrelevant since it's already excluded
    const holidays = new Set(['2026-01-10'])
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-09'), FULL, FULL, holidays)
    expect(res.totalDays).toBe(5) // unchanged
  })

  it('returns error when all weekdays are public holidays', () => {
    // Entire Mon–Fri 2026-01-05 → 2026-01-09 are public holidays
    const holidays = new Set([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
    ])
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-09'), FULL, FULL, holidays)
    expect(res.totalDays).toBe(0)
    expect(res.error).toBeDefined()
  })

  it('single-day leave on a public holiday returns error', () => {
    const holidays = new Set(['2026-01-07']) // Wednesday
    const res = calculateLeaveDays(d('2026-01-07'), d('2026-01-07'), FULL, FULL, holidays)
    expect(res.totalDays).toBe(0)
    expect(res.error).toBeDefined()
  })

  it('half-day start + holiday mid-week = correct deduction', () => {
    // Wed is holiday: effective working days = 4, minus 0.5 for half-day start = 3.5
    const holidays = new Set(['2026-01-07'])
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-09'), MORNING, FULL, holidays)
    expect(res.totalDays).toBe(3.5)
  })

  it('leave spanning two weeks with a holiday each week', () => {
    // 2026-01-05 (Mon) → 2026-01-16 (Fri) = 10 working days
    // Holidays on 2026-01-07 (Wed wk1) and 2026-01-14 (Wed wk2) → 8 working days
    const holidays = new Set(['2026-01-07', '2026-01-14'])
    const res = calculateLeaveDays(d('2026-01-05'), d('2026-01-16'), FULL, FULL, holidays)
    expect(res.totalDays).toBe(8)
  })
})
