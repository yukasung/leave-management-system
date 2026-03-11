/**
 * Date utilities — single source of truth for date formatting.
 *
 * Storage rule : all dates saved to the database use Common Era (CE).
 * Display rule : all user-facing dates show Buddhist Era (BE = CE + 543).
 * Input rule   : when a user types/selects a BE year, convert to CE before saving.
 *
 * Safe to import in both server components and 'use client' components.
 */

const MONTH_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

// ── Year conversion ────────────────────────────────────────────────────────────

/** Convert a CE year to BE year for display. BE = CE + 543. */
export function toBE(ceYear: number): number {
  return ceYear + 543
}

/** Convert a BE year (from user input) to CE year for storage. CE = BE - 543. */
export function toCE(beYear: number): number {
  return beYear - 543
}

// ── Date object → display string (DB value → UI) ─────────────────────────────

/**
 * Long Thai date with BE year.
 * e.g. new Date('2026-04-15') → "15 เมษายน 2569"
 */
export function formatThaiDate(date: Date): string {
  const d = date.getDate()
  const m = MONTH_TH[date.getMonth()]
  const y = toBE(date.getFullYear())
  return `${d} ${m} ${y}`
}

/**
 * Short Thai date DD/MM/YYYY(BE).
 * e.g. new Date('2026-04-15') → "15/04/2569"
 */
export function formatThaiDateShort(date: Date): string {
  const d = String(date.getDate()).padStart(2, '0')
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const y = toBE(date.getFullYear())
  return `${d}/${m}/${y}`
}

/**
 * Thai date-time string with BE year.
 * e.g. "15 เม.ย. 2569 13:45" or "15 เม.ย. 2569 13:45:30" (with seconds)
 */
export function formatThaiDateTime(date: Date, includeSeconds = false): string {
  const d = date.getDate()
  const m = MONTH_TH[date.getMonth()].slice(0, 3) + '.'
  const y = toBE(date.getFullYear())
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  const base = `${d} ${m} ${y} ${hh}:${mm}`
  if (includeSeconds) {
    const ss = String(date.getSeconds()).padStart(2, '0')
    return `${base}:${ss}`
  }
  return base
}

// ── ISO string → display string ───────────────────────────────────────────────

/**
 * Format a "YYYY-MM-DD" ISO date string as a long Thai date with BE year.
 * e.g. "2026-04-15" → "15 เมษายน 2569"
 */
export function formatThaiDateFromISO(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${d} ${MONTH_TH[m - 1]} ${toBE(y)}`
}

/**
 * Format a "YYYY-MM-DD" ISO date string as DD/MM/YYYY(BE).
 * e.g. "2026-04-15" → "15/04/2569"
 */
export function formatThaiDateShortFromISO(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${toBE(y)}`
}
