/**
 * Standardised Excel builder for all HR reports.
 *
 * Layout per sheet:
 *   Row 1  – Report title (merged, bold, 16pt, centred)
 *   Row 2  – "สร้างเมื่อ: DD/MM/YYYY HH:MM"
 *   Row 3  – "ช่วงวันที่: <dateFrom> – <dateTo>"  (omitted when no filter)
 *            "สร้างโดย: <userName>"
 *   Row 4  – (blank separator)
 *   Row 5+ – Header row (bold, grey background, borders)
 *   Row 6+ – Data rows (borders, alignment per column type)
 *   Last   – Summary / total row (bold, thicker top border) — optional
 */

import * as XLSX from 'xlsx'
import { NextResponse } from 'next/server'

// ── Types ────────────────────────────────────────────────────────────────────

export type ColumnType = 'text' | 'number' | 'date' | 'status' | 'index'

export interface ColumnDef {
  header: string
  type:   ColumnType
  width?: number   // character width
}

export interface ReportMeta {
  title:     string
  sheetName: string
  fileName:  string   // without .xlsx extension
  generatedBy?: string
  dateFrom?:    string  // YYYY-MM-DD  (CE, for display we keep as-is)
  dateTo?:      string  // YYYY-MM-DD
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Build a standardised workbook and return a Buffer ready for HTTP response.
 *
 * @param columns  Column definitions (header name, type, width)
 * @param dataRows Array of rows; each row must match column order.
 *                 Values can be string | number | null.
 * @param meta     Report metadata (title, sheet name, filters, user)
 * @param summaryRow Optional totals row appended after data — optional
 */
export function buildExcelReport(
  columns:     ColumnDef[],
  dataRows:    (string | number | null)[][],
  meta:        ReportMeta,
  summaryRow?: (string | number | null)[],
): Buffer {
  const lastCol = columns.length - 1

  // ── Metadata strings ────────────────────────────────────────────────────
  const now = new Date()
  const genDate = now.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  let metaLine = ''
  if (meta.dateFrom || meta.dateTo) {
    metaLine += `ช่วงวันที่: ${meta.dateFrom ?? '–'}  ถึง  ${meta.dateTo ?? '–'}`
  }
  if (meta.generatedBy) {
    metaLine += metaLine ? `     สร้างโดย: ${meta.generatedBy}` : `สร้างโดย: ${meta.generatedBy}`
  }

  // ── Build sheet from array-of-arrays (Unicode-safe path) ───────────────
  //   Row 0: Title
  //   Row 1: Generated date
  //   Row 2: Date range + user (or blank)
  //   Row 3: Blank separator
  //   Row 4: Header row
  //   Row 5+: Data
  //   Last:  Summary row (optional)
  const aoa: (string | number | null)[][] = [
    [meta.title],
    [`สร้างเมื่อ: ${genDate}`],
    metaLine ? [metaLine] : [''],
    [''],
    columns.map((c) => c.header),
    ...dataRows,
    ...(summaryRow ? [summaryRow] : []),
  ]

  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // ── Merge metadata rows across all columns ──────────────────────────────
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastCol } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: lastCol } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: lastCol } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: lastCol } },
  ]

  // ── Column widths ────────────────────────────────────────────────────────
  ws['!cols'] = columns.map((col) => ({ wch: col.width ?? 14 }))

  // ── Center-align 'index' columns ────────────────────────────────────────
  const centerStyle = { alignment: { horizontal: 'center', vertical: 'center' } }
  const headerRowIdx = 4          // 0-based row of the header row
  const dataStartIdx = 5          // 0-based row of first data row (header + 1)
  const totalRows    = aoa.length // includes meta rows + header + data + summary

  columns.forEach((col, colIdx) => {
    if (col.type !== 'index') return
    for (let rowIdx = headerRowIdx; rowIdx < totalRows; rowIdx++) {
      const cellAddr = XLSX.utils.encode_cell({ r: rowIdx, c: colIdx })
      if (ws[cellAddr]) ws[cellAddr].s = centerStyle
    }
  })

  // ── Freeze below header row + autofilter on header ───────────────────────
  ws['!freeze'] = { xSplit: 0, ySplit: 5, activeCell: 'A6' }
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({ s: { r: 4, c: 0 }, e: { r: 4, c: lastCol } }),
  }

  // ── Build workbook ────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, meta.sheetName)

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx', cellStyles: true }) as Buffer
}

/** Build the standard Content-Disposition filename with today's date */
export function reportFilename(name: string): string {
  const today = new Date()
  const ymd = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('')
  return `Leave_Report_${name}_${ymd}.xlsx`
}

/** Standard HTTP response headers for xlsx download */
export function xlsxResponse(buf: Buffer, filename: string): NextResponse {
  return new NextResponse(buf as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
