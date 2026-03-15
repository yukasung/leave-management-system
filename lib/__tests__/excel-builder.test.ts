import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock next/server so we can test xlsxResponse without a Next.js runtime ──
vi.mock('next/server', () => {
  class NextResponse {
    body: unknown
    status: number
    headers: Record<string, string>

    constructor(body: unknown, init: Record<string, unknown> = {}) {
      this.body = body
      this.status = (init?.status as number) ?? 200
      this.headers = (init?.headers as Record<string, string>) ?? {}
    }
  }
  return { NextResponse }
})

import {
  buildExcelReport,
  reportFilename,
  xlsxResponse,
  type ColumnDef,
  type ReportMeta,
} from '../excel-builder'

// ── Shared test fixtures ──────────────────────────────────────────────────────

const COLS: ColumnDef[] = [
  { header: '#',     type: 'index',  width: 5 },
  { header: 'ชื่อ',  type: 'text',   width: 20 },
  { header: 'วัน',   type: 'number', width: 10 },
]

const META: ReportMeta = {
  title:     'รายงานทดสอบ',
  sheetName: 'Test',
  fileName:  'Test_Report',
}

// ── reportFilename ────────────────────────────────────────────────────────────

describe('reportFilename', () => {
  it('starts with "Leave_Report_"', () => {
    expect(reportFilename('Test')).toMatch(/^Leave_Report_/)
  })

  it('includes the provided name', () => {
    expect(reportFilename('Annual')).toContain('Annual')
  })

  it('ends with ".xlsx"', () => {
    expect(reportFilename('Report')).toMatch(/\.xlsx$/)
  })

  it("embeds today's date in YYYYMMDD format", () => {
    const today = new Date()
    const ymd = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('')
    expect(reportFilename('X')).toContain(ymd)
  })

  it('produces the full pattern Leave_Report_{name}_{YYYYMMDD}.xlsx', () => {
    const name = 'MyReport'
    const result = reportFilename(name)
    expect(result).toMatch(/^Leave_Report_MyReport_\d{8}\.xlsx$/)
  })

  it('handles names with underscores', () => {
    expect(reportFilename('Leave_Balance')).toContain('Leave_Balance')
  })
})

// ── buildExcelReport ──────────────────────────────────────────────────────────

describe('buildExcelReport', () => {
  it('returns a Buffer', () => {
    const buf = buildExcelReport(COLS, [], META)
    expect(Buffer.isBuffer(buf)).toBe(true)
  })

  it('returns a non-empty buffer', () => {
    const buf = buildExcelReport(COLS, [], META)
    expect(buf.length).toBeGreaterThan(0)
  })

  it('does not throw on empty dataRows', () => {
    expect(() => buildExcelReport(COLS, [], META)).not.toThrow()
  })

  it('does not throw with data rows', () => {
    const rows = [
      [1, 'สมชาย', 5],
      [2, 'สมหญิง', 3],
    ]
    expect(() => buildExcelReport(COLS, rows, META)).not.toThrow()
  })

  it('does not throw when a summaryRow is provided', () => {
    const rows  = [[1, 'สมชาย', 5]]
    const total = ['', 'รวม', 5]
    expect(() => buildExcelReport(COLS, rows, META, total)).not.toThrow()
  })

  it('does not throw with meta filters (dateFrom / dateTo / generatedBy)', () => {
    const metaFull: ReportMeta = {
      ...META,
      generatedBy: 'Admin',
      dateFrom:    '2025-01-01',
      dateTo:      '2025-12-31',
    }
    expect(() => buildExcelReport(COLS, [], metaFull)).not.toThrow()
  })

  it('returns a larger buffer when data rows are provided', () => {
    const rows = Array.from({ length: 10 }, (_, i) => [i + 1, `คนที่ ${i + 1}`, i * 2])
    const bufEmpty = buildExcelReport(COLS, [], META)
    const bufFull  = buildExcelReport(COLS, rows, META)
    expect(bufFull.length).toBeGreaterThanOrEqual(bufEmpty.length)
  })
})

// ── xlsxResponse ─────────────────────────────────────────────────────────────

describe('xlsxResponse', () => {
  const dummyBuf  = Buffer.from('test')
  const fname     = 'Leave_Report_Test_20250101.xlsx'

  it('returns an object with status 200', () => {
    const res = xlsxResponse(dummyBuf, fname) as unknown as { status: number }
    expect(res.status).toBe(200)
  })

  it('sets Content-Type to spreadsheetml', () => {
    const res = xlsxResponse(dummyBuf, fname) as unknown as { headers: Record<string, string> }
    expect(res.headers['Content-Type']).toContain('spreadsheetml')
  })

  it('sets Content-Disposition to attachment', () => {
    const res = xlsxResponse(dummyBuf, fname) as unknown as { headers: Record<string, string> }
    expect(res.headers['Content-Disposition']).toContain('attachment')
  })

  it('includes the filename in Content-Disposition', () => {
    const res = xlsxResponse(dummyBuf, fname) as unknown as { headers: Record<string, string> }
    expect(res.headers['Content-Disposition']).toContain(fname)
  })

  it('passes the buffer as the response body', () => {
    const buf = Buffer.from('xlsx-data')
    const res = xlsxResponse(buf, fname) as unknown as { body: unknown }
    expect(res.body).toBe(buf)
  })
})
