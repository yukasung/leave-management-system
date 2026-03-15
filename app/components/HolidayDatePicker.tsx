'use client'

/**
 * HolidayDatePicker
 *
 * A custom calendar input that:
 *  - Highlights public holidays (stored in CompanyHoliday) in red
 *  - Highlights weekends (Sat/Sun) in a lighter red
 *  - Respects a `min` date (disables earlier dates)
 *  - Renders a hidden <input name={name}> for native form submission
 *  - Shows Buddhist Era year (CE + 543)
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { formatThaiDateFromISO, toBE } from '@/lib/date-utils'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  id?: string
  name: string
  value: string                       // YYYY-MM-DD
  min?: string                        // YYYY-MM-DD
  onChange: (date: string) => void
  disabled?: boolean
  className?: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const WEEKDAY_HEADERS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']

const MONTH_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน',
  'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม',
  'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
]

const TODAY = new Date().toISOString().split('T')[0]

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseYM(dateStr: string): { year: number; month: number } {
  if (!dateStr) {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() }
  }
  const [y, m] = dateStr.split('-').map(Number)
  return { year: y, month: m - 1 }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function HolidayDatePicker({
  id, name, value, min, onChange, disabled, className,
}: Props) {
  // ── View state (month/year shown in calendar)
  const [open, setOpen] = useState(false)
  const [viewYear, setViewYear]   = useState(() => parseYM(value).year)
  const [viewMonth, setViewMonth] = useState(() => parseYM(value).month)

  // ── Holiday data: Map<YYYY-MM-DD, holidayName>
  const [holidayMap, setHolidayMap] = useState<Map<string, string>>(new Map())
  const fetchedYears = useRef<Set<number>>(new Set())

  // ── Refs
  const containerRef = useRef<HTMLDivElement>(null)

  // ── Sync view to selected value when calendar opens
  useEffect(() => {
    if (open && value) {
      const { year, month } = parseYM(value)
      setViewYear(year)
      setViewMonth(month)
    }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Fetch holidays for a year (and adjacent year when near month boundary)
  const fetchHolidays = useCallback(async (year: number) => {
    if (fetchedYears.current.has(year)) return
    fetchedYears.current.add(year)
    try {
      const res = await fetch(`/api/holidays?year=${year}`)
      if (!res.ok) return
      const data = await res.json()
      const list: { date: string; name: string }[] = data.holidays ?? []
      setHolidayMap((prev) => {
        const next = new Map(prev)
        for (const h of list) next.set(h.date, h.name)
        return next
      })
    } catch {
      // silently ignore — don't break the form if API is down
    }
  }, [])

  useEffect(() => {
    fetchHolidays(viewYear)
    if (viewMonth === 11) fetchHolidays(viewYear + 1)
    if (viewMonth === 0)  fetchHolidays(viewYear - 1)
  }, [viewYear, viewMonth, fetchHolidays])

  // ── Close on outside click
  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  // ── Navigation
  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  // ── Build calendar grid (Mon-first, 7 columns)
  function buildCells(): Array<{ day: number | null; dateStr: string | null; col: number }> {
    const firstDay   = new Date(viewYear, viewMonth, 1).getDay()      // 0=Sun…6=Sat
    const startOffset = (firstDay + 6) % 7                            // Mon=0…Sun=6
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

    const cells: Array<{ day: number | null; dateStr: string | null; col: number }> = []

    for (let i = 0; i < startOffset; i++) {
      cells.push({ day: null, dateStr: null, col: i % 7 })
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const col = (startOffset + d - 1) % 7
      const mm  = String(viewMonth + 1).padStart(2, '0')
      const dd  = String(d).padStart(2, '0')
      cells.push({ day: d, dateStr: `${viewYear}-${mm}-${dd}`, col })
    }
    return cells
  }

  function handleSelect(dateStr: string) {
    if (min && dateStr < min) return
    onChange(dateStr)
    setOpen(false)
  }

  const cells = buildCells()

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative">
      {/* Hidden input so the value is included in FormData */}
      <input type="hidden" name={name} value={value} />

      {/* Trigger button */}
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={[
          'w-full px-3 py-2.5 border rounded-lg text-left text-sm transition-colors',
          disabled
            ? 'bg-muted text-muted-foreground cursor-not-allowed border-input'
            : 'bg-background border-input hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary',
          className ?? '',
        ].join(' ')}
      >
        {value
          ? <span className="text-foreground">{formatThaiDateFromISO(value)}</span>
          : <span className="text-gray-400">เลือกวันที่</span>
        }
        <span className="float-right text-muted-foreground/60 mt-0.5">📅</span>
      </button>

      {/* Calendar dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 bg-card rounded-xl shadow-xl border border-border p-3 w-72">

          {/* Month / Year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={prevMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/40 text-muted-foreground text-lg leading-none"
            >
              ‹
            </button>
            <span className="text-sm font-semibold text-foreground">
              {MONTH_TH[viewMonth]} {toBE(viewYear)}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted/40 text-muted-foreground text-lg leading-none"
            >
              ›
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAY_HEADERS.map((h, i) => (
              <div
                key={h}
                className={`text-center text-xs font-semibold py-1 ${
                  i >= 5 ? 'text-red-400' : 'text-gray-400'
                }`}
              >
                {h}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((cell, i) => {
              if (!cell.dateStr) {
                return <div key={`e-${i}`} />
              }

              const isSelected   = cell.dateStr === value
              const isDisabled   = !!(min && cell.dateStr < min)
              const isHoliday    = holidayMap.has(cell.dateStr)
              const isWeekend    = cell.col === 5 || cell.col === 6  // Sat or Sun
              const isToday      = cell.dateStr === TODAY
              const holidayName  = holidayMap.get(cell.dateStr)

              let cls = 'relative text-center text-sm rounded-lg py-1.5 w-full transition-colors '

              if (isSelected) {
                cls += 'bg-primary text-primary-foreground font-semibold shadow-sm'
              } else if (isDisabled) {
                cls += 'text-muted-foreground/30 cursor-not-allowed'
              } else if (isHoliday) {
                cls += 'text-red-600 font-semibold hover:bg-red-50 cursor-pointer'
              } else if (isWeekend) {
                cls += 'text-red-400 hover:bg-red-50 cursor-pointer'
              } else {
                cls += 'text-foreground hover:bg-primary/5 cursor-pointer'
              }

              if (isToday && !isSelected) {
                cls += ' ring-1 ring-inset ring-blue-400'
              }

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelect(cell.dateStr!)}
                  title={holidayName}
                  className={cls}
                >
                  {cell.day}
                  {/* Small holiday dot */}
                  {isHoliday && !isSelected && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-red-500" />
                  )}
                </button>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-3 pt-2 border-t border-border flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-400 inline-block" />
              วันหยุดนักขัตฤกษ์
            </span>
            <span className="flex items-center gap-1">
              <span className="text-red-400 font-medium">ส อา</span>
              เสาร์/อาทิตย์
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-sm ring-1 ring-blue-400 inline-block" />
              วันนี้
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
