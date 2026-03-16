'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { formatThaiDateShortFromISO, toBE } from '@/lib/date-utils'
import HolidayDatePicker from '@/app/components/HolidayDatePicker'

// ── Types ────────────────────────────────────────────────────────────────────

interface SavedHoliday {
  id:     string
  date:   string
  name:   string
  source: 'BOT' | 'MANUAL'
}

interface HolidayPreview {
  date: string   // "YYYY-MM-DD"
  name: string
}

interface PreviewResponse {
  year: number
  total: number
  warning?: string
  holidays: HolidayPreview[]
}

interface ImportResult {
  year: number
  mode: 'upsert' | 'replace'
  totalFetched: number
  totalInserted: number
  totalUpdated: number
  totalSkipped: number
}

type botStage = 'idle' | 'previewing' | 'previewed' | 'importing' | 'done' | 'error'
type csvStage = 'idle' | 'parsed' | 'importing' | 'done' | 'error'

// ── Constants ────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i)

// ── Helpers ──────────────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HolidayImportClient() {
  // ── Shared state ────────────────────────────────────────────────────────────
  const [year, setYear] = useState<number>(CURRENT_YEAR)

  // ── Saved holidays ───────────────────────────────────────────────────────────
  const [saved, setSaved]         = useState<SavedHoliday[]>([])
  const [loadingSaved, setLoadingSaved] = useState(false)
  const [deletingId, setDeletingId]     = useState<string | null>(null)

  const loadSaved = useCallback(async (y: number) => {
    setLoadingSaved(true)
    try {
      const res = await fetch(`/api/admin/holidays?year=${y}`)
      if (!res.ok) return
      const data: { holidays: SavedHoliday[] } = await res.json()
      setSaved(data.holidays)
    } finally {
      setLoadingSaved(false)
    }
  }, [])

  useEffect(() => { void loadSaved(year) }, [year, loadSaved])

  // ── BOT import state ─────────────────────────────────────────────────────────
  const [botStage, setBotStage]   = useState<botStage>('idle')
  const [preview, setPreview]     = useState<PreviewResponse | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [botError, setBotError]   = useState<string>('')

  async function handleBOTPreview() {
    setBotStage('previewing')
    setPreview(null)
    setImportResult(null)
    setBotError('')
    try {
      let res = await fetch(`/api/admin/holidays/import-preview?year=${year}`)
      // Retry once on 404 (dev server may not have compiled the route yet)
      if (res.status === 404) {
        await new Promise((r) => setTimeout(r, 800))
        res = await fetch(`/api/admin/holidays/import-preview?year=${year}`)
      }
      if (!res.ok) {
        let errMsg = `HTTP ${res.status}`
        try {
          const body = await res.json()
          if (body?.error) errMsg = body.error
        } catch { /* non-JSON response */ }
        throw new Error(errMsg)
      }
      const data: PreviewResponse = await res.json()
      setPreview(data)
      setBotStage('previewed')
    } catch (err) {
      setBotError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
      setBotStage('error')
    }
  }

  async function handleBOTImport(mode: 'upsert' | 'replace' = 'upsert') {
    setBotStage('importing')
    setBotError('')
    try {
      const res = await fetch('/api/admin/holidays/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, mode }),
      })
      if (!res.ok) {
        const lody = await res.json().catch(() => ({}))
        throw new Error((lody as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data: ImportResult = await res.json()
      setImportResult(data)
      setBotStage('done')
      await loadSaved(year)
    } catch (err) {
      setBotError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ')
      setBotStage('error')
    }
  }

  function resetBOT() {
    setBotStage('idle')
    setPreview(null)
    setImportResult(null)
    setBotError('')
  }

  // ── CSV/Excel upload state ───────────────────────────────────────────────────
  const [csvStage, setCsvStage]           = useState<csvStage>('idle')
  const [csvPreview, setCsvPreview]       = useState<HolidayPreview[] | null>(null)
  const [csvImportResult, setCsvImportResult] = useState<ImportResult | null>(null)
  const [csvError, setCsvError]           = useState('')
  const csvFileRef                        = useRef<HTMLInputElement>(null)

  function parseDateToISO(raw: string): string | null {
    const s = raw.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // DD/MM/YYYY or DD/MM/YY (handle Buddhist Era > 2500)
    const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/)
    if (dmy) {
      const d = dmy[1].padStart(2, '0')
      const m = dmy[2].padStart(2, '0')
      let y = parseInt(dmy[3])
      if (y < 100) y += 2000
      if (y > 2500) y -= 543   // Buddhist Era → Common Era
      return `${y}-${m}-${d}`
    }
    return null
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvStage('idle')
    setCsvPreview(null)
    setCsvError('')
    setCsvImportResult(null)
    try {
      const XLSX = await import('xlsx')
      const isCsv = file.name.toLowerCase().endsWith('.csv')
      let workbook: ReturnType<typeof XLSX.read>

      if (isCsv) {
        // Read CSV as UTF-8 text to preserve Thai characters
        const text = await file.text()
        workbook = XLSX.read(text, { type: 'string' })
      } else {
        const data = await file.arrayBuffer()
        workbook = XLSX.read(data, { codepage: 65001 })
      }
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false })

      // Detect header row and column indices
      let headerRow = -1
      let dateCol = 0
      let nameCol = 1

      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const cells = (rows[i] as unknown[]).map((c) => String(c ?? '').toLowerCase())
        const hasDate = cells.some((c) => c.includes('date') || c.includes('วันที่'))
        if (hasDate) {
          headerRow = i
          const dIdx = cells.findIndex((c) => c.includes('date') || c.includes('วันที่'))
          dateCol = dIdx >= 0 ? dIdx : 0
          // Prefer Thai name column
          const thIdx = cells.findIndex((c) => c.includes('thai') || c.includes('ชื่อ') || c.includes('descriptionthai'))
          const enIdx = cells.findIndex((c) => c.includes('description') && !c.includes('thai'))
          nameCol = thIdx >= 0 ? thIdx : enIdx >= 0 ? enIdx : 1
          break
        }
      }

      const holidays: HolidayPreview[] = []
      for (let i = headerRow + 1; i < rows.length; i++) {
        const row = rows[i] as unknown[]
        if (!row || row.length === 0) continue
        const dateRaw = String(row[dateCol] ?? '').trim()
        const nameRaw = String(row[nameCol] ?? '').trim()
        if (!dateRaw || !nameRaw) continue
        const isoDate = parseDateToISO(dateRaw)
        if (!isoDate) continue
        holidays.push({ date: isoDate, name: nameRaw })
      }

      if (holidays.length === 0)
        throw new Error('ไม่พบข้อมูลวันหยุดในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ (คอลัมน์วันที่และชื่อวันหยุด)')

      setCsvPreview(holidays)
      setCsvStage('parsed')
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'อ่านไฟล์ไม่สำเร็จ')
      setCsvStage('error')
    }
  }

  async function handleCSVImport(mode: 'upsert' | 'replace' = 'upsert') {
    if (!csvPreview) return
    setCsvStage('importing')
    setCsvError('')
    try {
      const res = await fetch('/api/admin/holidays/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, mode, holidays: csvPreview }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      const data: ImportResult = await res.json()
      setCsvImportResult(data)
      setCsvStage('done')
      await loadSaved(year)
      if (csvFileRef.current) csvFileRef.current.value = ''
    } catch (err) {
      setCsvError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
      setCsvStage('error')
    }
  }

  function resetCSV() {
    setCsvStage('idle')
    setCsvPreview(null)
    setCsvError('')
    setCsvImportResult(null)
    if (csvFileRef.current) csvFileRef.current.value = ''
  }

  // ── Manual add state ─────────────────────────────────────────────────────────
  const [manualDate, setManualDate]   = useState<string>(toISODate(new Date()))
  const [manualName, setManualName]   = useState<string>('')
  const [addLoading, setAddLoading]   = useState(false)
  const [addError, setAddError]       = useState<string>('')
  const [addSuccess, setAddSuccess]   = useState<string>('')

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault()
    setAddLoading(true)
    setAddError('')
    setAddSuccess('')
    try {
      const res = await fetch('/api/admin/holidays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: manualDate, name: manualName }),
      })
      if (!res.ok) {
        const lody = await res.json().catch(() => ({}))
        throw new Error((lody as { error?: string }).error ?? `HTTP ${res.status}`)
      }
      setAddSuccess(`เพิ่ม "${manualName}" สำเร็จ`)
      setManualName('')
      setManualDate(toISODate(new Date()))
      await loadSaved(year)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาด')
    } finally {
      setAddLoading(false)
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm('ยืนยันการลบวันหยุดนี้?')) return
    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/holidays/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const lody = await res.json().catch(() => ({}))
        alert((lody as { error?: string }).error ?? 'ลบไม่สำเร็จ')
        return
      }
      setSaved((prev) => prev.filter((h) => h.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  const botLoading = botStage === 'previewing' || botStage === 'importing'

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">

      {/* ───────── SECTION 1: Year selector ────────────────────────────────── */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <label htmlFor="year-select" className="block text-sm font-semibold text-foreground ml-2">
          เลือกปี (พ.ศ.)
        </label>
        <select
          id="year-select"
          value={year}
          onChange={(e) => {
            setYear(Number(e.target.value))
            resetBOT()
          }}
          className="block w-40 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        >
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>{toBE(y)}</option>
          ))}
        </select>
      </div>

      {/* ───────── SECTION 2: BOT import ────────────────────────────────────── */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">
          นำเข้าวันหยุดนักขัตฤกษ์จาก ธนาคารแห่งประเทศไทย (BOT API)
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleBOTPreview}
            disabled={botLoading}
            className="inline-flex items-center gap-2 bg-primary hover:lg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {botStage === 'previewing' ? <><Spinner /> กำลังโหลด…</> : 'Preview วันหยุด BOT'}
          </button>

          {botStage === 'previewed' && preview && preview.total > 0 && (
            <>
              {saved.length > 0 && (
                <button
                  onClick={() => handleBOTImport('upsert')}
                  title={`เพิ่มวันหยุดที่ยังไม่มี และอัปเดตชื่อของวันหยุด BOT ที่เปลี่ยนแปลง
วันหยุดที่เพิ่มด้วยตนเอง (Manual) จะไม่ถูกแตะต้อง`}
                  className="inline-flex items-center gap-2 bg-green-600 hover:lg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  อัปเดตข้อมูล (Upsert)
                </button>
              )}
              <button
                onClick={() => handleBOTImport('replace')}
                title={`ลบวันหยุด BOT ทั้งหมดในปีนี้ออกก่อน แล้วนำเข้าข้อมูลใหม่ทั้งหมด
วันหยุดที่เพิ่มด้วยตนเอง (Manual) จะไม่ถูกลบ`}
                className="inline-flex items-center gap-2 bg-red-600 hover:lg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {saved.length === 0 ? 'นำเข้าข้อมูล' : 'นำเข้าใหม่ทั้งหมด (Replace)'}
              </button>
            </>
          )}

          {botStage === 'importing' && (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> กำลังนำเข้าข้อมูล…
            </span>
          )}

          {(botStage === 'previewed' || botStage === 'done' || botStage === 'error') && (
            <button
              onClick={resetBOT}
              className="inline-flex items-center gap-2 border border-input bg-background hover:bg-muted text-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              ยกเลิก
            </button>
          )}
        </div>

        {/* BOT error */}
        {botStage === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-semibold">เกิดข้อผิดพลาด:</span> {botError}
          </div>
        )}

        {/* API warning banner */}
        {botStage === 'previewed' && preview?.warning && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <p className="font-semibold text-amber-700 ml-1">⚠️ ไม่พบข้อมูลวันหยุด</p>
            <p>{preview.warning}</p>
            <p className="mt-1">กรุณาเพิ่มวันหยุดด้วยตนเองผ่าน <strong>เพิ่มวันหยุดด้วยตนเอง</strong> ด้านล่าง</p>
          </div>
        )}

        {/* BOT success banner */}
        {botStage === 'done' && importResult && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-semibold text-green-700 mb-1">
              ✅ นำเข้าสำเร็จ ({importResult.mode === 'replace' ? 'Replace' : 'Upsert'})
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>ดึงข้อมูลทั้งหมด: <strong>{importResult.totalFetched}</strong> วัน</li>
              <li>นำเข้าใหม่: <strong>{importResult.totalInserted}</strong> วัน</li>
              {importResult.mode === 'upsert' && (
                <li>อัปเดตชื่อ: <strong>{importResult.totalUpdated}</strong> วัน</li>
              )}
              <li>ข้ามรายการ: <strong>{importResult.totalSkipped}</strong> วัน</li>
            </ul>
          </div>
        )}

        {/* Preview talle */}
        {botStage === 'previewed' && preview && preview.holidays.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-10">#</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">วันที่</th>
                  <th className="text-left px-4 py-3 font-semibold text-muted-foreground">ชื่อวันหยุด</th>
                  <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-28">วันในสัปดาห์</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {preview.holidays.map((h, i) => {
                  const [yr, mo, da] = h.date.split('-').map(Number)
                  const jsDate = new Date(Date.UTC(yr, mo - 1, da))
                  const weekday = jsDate.toLocaleDateString('th-TH', { weekday: 'long', timeZone: 'UTC' })
                  const isWeekend = jsDate.getUTCDay() === 0 || jsDate.getUTCDay() === 6
                  return (
                    <tr key={h.date} className="hover:lg-gray-50">
                      <td className="text-center px-4 py-3 text-muted-foreground/60">{i + 1}</td>
                      <td className="px-4 py-3 text-foreground font-medium tabular-nums">{formatThaiDateShortFromISO(h.date)}</td>
                      <td className="px-4 py-3 text-foreground">{h.name}</td>
                      <td className={`text-center px-4 py-3 text-xs font-medium ${isWeekend ? 'text-red-600' : 'text-muted-foreground'}`}>{weekday}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ───────── SECTION 2.5: CSV / Excel upload ──────────────────────────── */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">
            นำเข้าวันหยุดจากไฟล์ CSV / Excel
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            ใช้เมื่อ BOT API ไม่สามารถเชื่อมต่อได้ — ดาวน์โหลดไฟล์จาก{' '}
            <a
              href="https://app.bot.or.th/BOTHWS/faces/pages/form/frm_fin_inst_holiday.xhtml"
              target="_blank"
              rel="noreferrer"
              className="underline text-primary"
            >
              เว็บไซต์ ธปท.
            </a>{' '}
            แล้วอัปโหลดที่นี่
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 cursor-pointer border border-input bg-background hover:bg-muted text-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            📂 เลือกไฟล์ (.xlsx / .csv)
            <input
              ref={csvFileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {csvStage === 'parsed' && csvPreview && csvPreview.length > 0 && (
            <>
              {saved.length > 0 && (
                <button
                  onClick={() => handleCSVImport('upsert')}
                  className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  อัปเดตข้อมูล (Upsert)
                </button>
              )}
              <button
                onClick={() => handleCSVImport('replace')}
                className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {saved.length === 0 ? 'นำเข้าข้อมูล' : 'นำเข้าใหม่ทั้งหมด (Replace)'}
              </button>
            </>
          )}

          {csvStage === 'importing' && (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner /> กำลังนำเข้าข้อมูล…
            </span>
          )}

          {(csvStage === 'parsed' || csvStage === 'done' || csvStage === 'error') && (
            <button
              onClick={resetCSV}
              className="inline-flex items-center gap-2 border border-input bg-background hover:bg-muted text-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              ล้าง
            </button>
          )}
        </div>

        {csvStage === 'error' && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-semibold">เกิดข้อผิดพลาด:</span> {csvError}
          </div>
        )}

        {csvStage === 'done' && csvImportResult && (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-semibold text-green-700 mb-1">
              ✅ นำเข้าสำเร็จ ({csvImportResult.mode === 'replace' ? 'Replace' : 'Upsert'})
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>ดึงข้อมูลทั้งหมด: <strong>{csvImportResult.totalFetched}</strong> วัน</li>
              <li>นำเข้าใหม่: <strong>{csvImportResult.totalInserted}</strong> วัน</li>
              {csvImportResult.mode === 'upsert' && (
                <li>อัปเดตชื่อ: <strong>{csvImportResult.totalUpdated}</strong> วัน</li>
              )}
              <li>ข้ามรายการ: <strong>{csvImportResult.totalSkipped}</strong> วัน</li>
            </ul>
          </div>
        )}

        {csvStage === 'parsed' && csvPreview && csvPreview.length > 0 && (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="px-4 py-2 bg-muted/40 border-b border-border text-xs text-muted-foreground">
              พบ <strong>{csvPreview.length}</strong> รายการ — กรุณาตรวจสอบก่อนนำเข้า
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 sticky top-0">
                  <tr>
                    <th className="text-center px-3 py-2 font-semibold text-muted-foreground w-10">#</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">วันที่</th>
                    <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ชื่อวันหยุด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {csvPreview.map((h, i) => (
                    <tr key={h.date + i}>
                      <td className="text-center px-3 py-2 text-muted-foreground/60">{i + 1}</td>
                      <td className="px-3 py-2 font-medium tabular-nums">{formatThaiDateShortFromISO(h.date)}</td>
                      <td className="px-3 py-2">{h.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ───────── SECTION 3: Manual entry form ─────────────────────────────── */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-6">
        <h2 className="text-base font-semibold text-foreground mb-4">เพิ่มวันหยุดด้วยตนเอง</h2>

        <form onSubmit={handleManualAdd} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground ml-1">วันที่</label>
            <HolidayDatePicker
              name="manualDate"
              value={manualDate}
              onChange={(d) => setManualDate(d)}
            />
          </div>
          <div className="flex-1 min-w-56">
            <label className="block text-sm font-medium text-foreground ml-1">ชื่อวันหยุด <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              placeholder="เช่น วันสงกรานต์"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="block w-full rounded-lg border border-input bg-lackground text-foreground px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <button
            type="submit"
            disabled={addLoading}
            className="inline-flex items-center gap-2 bg-primary hover:lg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {addLoading ? <><Spinner /> กำลังบันทึก…</> : 'เพิ่มวันหยุด'}
          </button>
        </form>

        {addError && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {addError}
          </div>
        )}
        {addSuccess && (
          <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
            ✅ {addSuccess}
          </div>
        )}
      </div>

      {/* ───────── SECTION 4: Saved holidays talle ──────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              วันหยุดที่บันทึกแล้ว — ปี {toBE(year)}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {loadingSaved ? 'กำลังโหลด…' : `${saved.length} รายการ`}
            </p>
          </div>
        </div>

        {loadingSaved ? (
          <div className="flex justify-center py-10 text-gray-400">
            <Spinner />
          </div>
        ) : saved.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">📅</p>
            <p className="text-sm">ยังไม่มีวันหยุดที่บันทึกสำหรับปีนี้</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-10">#</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">วันที่</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">ชื่อวันหยุด</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-24">แหล่งที่มา</th>
                <th className="text-center px-4 py-3 font-semibold text-muted-foreground w-20">ลบ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {saved.map((h, i) => (
                <tr key={h.id} className="hover:lg-gray-50 transition-colors">
                  <td className="text-center px-4 py-3 text-muted-foreground/60">{i + 1}</td>
                  <td className="px-4 py-3 text-foreground font-medium tabular-nums">
                    {formatThaiDateShortFromISO(h.date)}
                  </td>
                  <td className="px-4 py-3 text-foreground">{h.name}</td>
                  <td className="text-center px-4 py-3">
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${
                      h.source === 'BOT'
                        ? 'lg-indigo-100 text-indigo-700'
                        : 'lg-emerald-100 text-emerald-700'
                    }`}>
                      {h.source === 'BOT' ? 'BOT' : 'Manual'}
                    </span>
                  </td>
                  <td className="text-center px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleDelete(h.id)}
                      disabled={deletingId === h.id}
                      className="text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors text-xs font-medium"
                    >
                      {deletingId === h.id ? <Spinner /> : 'ลบ'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

    </div>
  )
}

// ── Inline spinner ────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
