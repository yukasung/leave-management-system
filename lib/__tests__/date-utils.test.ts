import { describe, it, expect } from 'vitest'
import {
  toBE,
  toCE,
  formatThaiDate,
  formatThaiDateShort,
  formatThaiDateTime,
  formatThaiDateFromISO,
  formatThaiDateShortFromISO,
} from '@/lib/date-utils'

// ── toBE / toCE ───────────────────────────────────────────────────────────────

describe('toBE', () => {
  it('converts CE 2024 → BE 2567', () => {
    expect(toBE(2024)).toBe(2567)
  })
  it('converts CE 2026 → BE 2569', () => {
    expect(toBE(2026)).toBe(2569)
  })
  it('handles CE 0 → BE 543', () => {
    expect(toBE(0)).toBe(543)
  })
})

describe('toCE', () => {
  it('converts BE 2567 → CE 2024', () => {
    expect(toCE(2567)).toBe(2024)
  })
  it('converts BE 2569 → CE 2026', () => {
    expect(toCE(2569)).toBe(2026)
  })
  it('is the inverse of toBE', () => {
    expect(toCE(toBE(2025))).toBe(2025)
  })
})

// ── formatThaiDate ─────────────────────────────────────────────────────────────

describe('formatThaiDate', () => {
  it('formats 2026-04-15 as "15 เมษายน 2569"', () => {
    // Use UTC noon to avoid timezone edge issues when constructing the date
    const d = new Date(2026, 3, 15) // month is 0-indexed
    expect(formatThaiDate(d)).toBe('15 เมษายน 2569')
  })

  it('formats 2025-01-01 as "1 มกราคม 2568"', () => {
    const d = new Date(2025, 0, 1)
    expect(formatThaiDate(d)).toBe('1 มกราคม 2568')
  })

  it('formats 2024-12-31 as "31 ธันวาคม 2567"', () => {
    const d = new Date(2024, 11, 31)
    expect(formatThaiDate(d)).toBe('31 ธันวาคม 2567')
  })

  it('formats all 12 months correctly', () => {
    const months = [
      'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
      'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
      'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
    ]
    months.forEach((name, i) => {
      const d = new Date(2025, i, 1)
      expect(formatThaiDate(d)).toContain(name)
    })
  })
})

// ── formatThaiDateShort ────────────────────────────────────────────────────────

describe('formatThaiDateShort', () => {
  it('formats 2026-04-15 as "15/04/2569"', () => {
    const d = new Date(2026, 3, 15)
    expect(formatThaiDateShort(d)).toBe('15/04/2569')
  })

  it('pads day and month with leading zeros', () => {
    const d = new Date(2025, 0, 5) // 5 Jan 2025
    expect(formatThaiDateShort(d)).toBe('05/01/2568')
  })

  it('formats last day of year correctly', () => {
    const d = new Date(2024, 11, 31)
    expect(formatThaiDateShort(d)).toBe('31/12/2567')
  })
})

// ── formatThaiDateTime ─────────────────────────────────────────────────────────

describe('formatThaiDateTime', () => {
  it('formats date and time without seconds by default', () => {
    const d = new Date(2026, 3, 15, 13, 45, 30) // 15 Apr 2026 13:45:30
    // 'เมษายน'.slice(0, 3) + '.' = 'เมษ.'
    expect(formatThaiDateTime(d)).toBe('15 เมษ. 2569 13:45')
  })

  it('includes seconds when includeSeconds is true', () => {
    const d = new Date(2026, 3, 15, 13, 45, 30)
    expect(formatThaiDateTime(d, true)).toBe('15 เมษ. 2569 13:45:30')
  })

  it('pads hours and minutes with leading zeros', () => {
    const d = new Date(2025, 0, 1, 9, 5, 3) // 1 Jan 2025 09:05:03
    // 'มกราคม'.slice(0, 3) + '.' = 'มกร.'
    expect(formatThaiDateTime(d)).toBe('1 มกร. 2568 09:05')
    expect(formatThaiDateTime(d, true)).toBe('1 มกร. 2568 09:05:03')
  })

  it('uses abbreviated month names with a dot suffix', () => {
    const d = new Date(2025, 5, 20, 8, 0) // June 20 — 'มิถุนายน'.slice(0,3)+'.'
    const result = formatThaiDateTime(d)
    expect(result).toContain('มิถ.')
  })
})

// ── formatThaiDateFromISO ──────────────────────────────────────────────────────

describe('formatThaiDateFromISO', () => {
  it('converts "2026-04-15" to "15 เมษายน 2569"', () => {
    expect(formatThaiDateFromISO('2026-04-15')).toBe('15 เมษายน 2569')
  })

  it('converts "2025-01-01" to "1 มกราคม 2568"', () => {
    expect(formatThaiDateFromISO('2025-01-01')).toBe('1 มกราคม 2568')
  })

  it('converts "2024-12-31" to "31 ธันวาคม 2567"', () => {
    expect(formatThaiDateFromISO('2024-12-31')).toBe('31 ธันวาคม 2567')
  })

  it('returns empty string for empty input', () => {
    expect(formatThaiDateFromISO('')).toBe('')
  })
})

// ── formatThaiDateShortFromISO ─────────────────────────────────────────────────

describe('formatThaiDateShortFromISO', () => {
  it('converts "2026-04-15" to "15/04/2569"', () => {
    expect(formatThaiDateShortFromISO('2026-04-15')).toBe('15/04/2569')
  })

  it('converts "2025-01-05" to "05/01/2568"', () => {
    expect(formatThaiDateShortFromISO('2025-01-05')).toBe('05/01/2568')
  })

  it('pads single-digit day and month', () => {
    expect(formatThaiDateShortFromISO('2024-03-07')).toBe('07/03/2567')
  })

  it('returns empty string for empty input', () => {
    expect(formatThaiDateShortFromISO('')).toBe('')
  })
})
