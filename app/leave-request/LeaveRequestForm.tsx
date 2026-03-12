'use client'

import { useActionState, useState, useEffect, useRef, useTransition, useCallback } from 'react'
import { createLeaveRequest, submitLeaveRequest, type FormState } from './actions'
import { calculateLeaveDuration, WORK_START_HOUR, WORK_START_MIN, WORK_END_HOUR, WORK_END_MIN } from '@/lib/leave-calc'
import { buildPolicySummary, type LeaveTypePolicy } from '@/lib/leave-policy-utils'
import { formatDate } from '@/lib/format-date'
import HolidayDatePicker from '@/app/components/HolidayDatePicker'

type BalanceInfo = { totalDays: number; usedDays: number }

type Props = {
  leaveTypes: LeaveTypePolicy[]
  balanceByType: Record<string, BalanceInfo>
  usageByType: Record<string, number>
}

const initialState: FormState = {}

/** Format a Date as "YYYY-MM-DDTHH:mm" for datetime-local input value */
function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Default time strings for a fresh day */
const DEFAULT_START_TIME = `${String(WORK_START_HOUR).padStart(2, '0')}:${String(WORK_START_MIN).padStart(2, '0')}`
const DEFAULT_END_TIME   = `${String(WORK_END_HOUR).padStart(2, '0')}:${String(WORK_END_MIN).padStart(2, '0')}`

export default function LeaveRequestForm({ leaveTypes, balanceByType, usageByType }: Props) {
  const [state, formAction, pending] = useActionState(createLeaveRequest, initialState)

  // ── Two-step flow state ────────────────────────────────────────────────────
  type Phase = 'form' | 'confirm' | 'done'
  const [phase, setPhase] = useState<Phase>('form')
  const [submitPending, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  // Snapshot for confirmation screen
  const [snapshot, setSnapshot] = useState<{
    leaveTypeName: string
    leaveStartDateTime: string  // ISO string
    leaveEndDateTime:   string
    displayLabel: string
    totalDays: number
    reason: string
    documentName: string
  } | null>(null)

  // Move to confirmation phase when DRAFT is saved successfully
  useEffect(() => {
    if (state.success && state.leaveRequestId) {
      setPhase('confirm')
    }
  }, [state.success, state.leaveRequestId])

  const today = new Date().toISOString().split('T')[0]

  const [leaveTypeId, setLeaveTypeId] = useState('')
  const [startDate, setStartDate]     = useState(today)
  const [endDate, setEndDate]         = useState(today)
  const [startTime, setStartTime]     = useState(DEFAULT_START_TIME)
  const [endTime, setEndTime]         = useState(DEFAULT_END_TIME)
  const [documentUrl, setDocumentUrl]   = useState('')
  const [documentName, setDocumentName] = useState('')
  const [uploading, setUploading]       = useState(false)
  const [uploadError, setUploadError]   = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Holiday set for accurate client-side preview ──────────────────────────
  const [holidaySet, setHolidaySet] = useState<Set<string>>(new Set())
  const fetchedHolidayYears = useRef<Set<number>>(new Set())

  const fetchHolidaysForYear = useCallback(async (year: number) => {
    if (fetchedHolidayYears.current.has(year)) return
    fetchedHolidayYears.current.add(year)
    try {
      const res = await fetch(`/api/holidays?year=${year}`)
      if (!res.ok) return
      const data = await res.json()
      const list: { date: string }[] = data.holidays ?? []
      setHolidaySet((prev) => {
        const next = new Set(prev)
        for (const h of list) next.add(h.date)
        return next
      })
    } catch { /* ignore — preview degrades gracefully */ }
  }, [])

  useEffect(() => {
    const years = new Set<number>()
    if (startDate) years.add(new Date(startDate + 'T00:00:00').getFullYear())
    if (endDate)   years.add(new Date(endDate   + 'T00:00:00').getFullYear())
    years.forEach(fetchHolidaysForYear)
  }, [startDate, endDate, fetchHolidaysForYear])

  const selectedType = leaveTypes.find((lt) => lt.id === leaveTypeId) ?? null

  // Auto-sync end date if it goes before start
  useEffect(() => {
    if (startDate && endDate && endDate < startDate) setEndDate(startDate)
  }, [startDate, endDate])

  // Prevent midnight (00:00) — browser 12-hour pickers can produce midnight
  // when the user types "12" and leaves AM selected instead of switching to PM.
  useEffect(() => {
    if (startTime === '00:00') setStartTime(DEFAULT_START_TIME)
  }, [startTime])
  useEffect(() => {
    if (endTime === '00:00') setEndTime(DEFAULT_END_TIME)
  }, [endTime])

  // Auto-correct endTime when same-day and end ≤ start
  useEffect(() => {
    if (startDate === endDate && endTime && startTime && endTime <= startTime) {
      setEndTime(DEFAULT_END_TIME)
    }
  }, [startTime, startDate, endDate])

  // Combined datetime strings used for calc + form submission
  const leaveStartDateTime = startDate && startTime ? `${startDate}T${startTime}` : ''
  const leaveEndDateTime   = endDate   && endTime   ? `${endDate}T${endTime}`     : ''

  // Live preview
  const preview = (() => {
    if (!leaveStartDateTime || !leaveEndDateTime) return null
    return calculateLeaveDuration(
      new Date(leaveStartDateTime),
      new Date(leaveEndDateTime),
      holidaySet
    )
  })()

  // Remaining quota for selected type
  const remainingQuota = (() => {
    if (!selectedType) return null
    if (selectedType.deductFromBalance) {
      const bal = balanceByType[selectedType.id]
      if (!bal) return null
      return bal.totalDays - bal.usedDays
    }
    if (selectedType.maxDaysPerYear !== null) {
      const used = usageByType[selectedType.id] ?? 0
      return selectedType.maxDaysPerYear - used
    }
    return null
  })()

  const needsAttachment = selectedType?.requiresAttachment ?? false

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res  = await fetch('/api/upload/leave-document', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setUploadError(json.error ?? 'อัปโหลดไม่สำเร็จ')
      } else {
        setDocumentUrl(json.url)
        setDocumentName(json.name ?? file.name)
      }
    } catch {
      setUploadError('เกิดข้อผิดพลาดในการอัปโหลด')
    } finally {
      setUploading(false)
    }
  }

  function handleRemoveFile() {
    setDocumentUrl('')
    setDocumentName('')
    if (fileRef.current) fileRef.current.value = ''
  }

  // Capture snapshot then dispatch form action
  function handleFormAction(formData: FormData) {
    if (preview && !preview.error) {
      setSnapshot({
        leaveTypeName:      selectedType?.name ?? '',
        leaveStartDateTime,
        leaveEndDateTime,
        displayLabel:       preview.displayLabel,
        totalDays:          preview.totalDays,
        reason:             (formData.get('reason') as string) || '',
        documentName,
      })
    }
    formAction(formData)
  }

  const canSubmit =
    !pending &&
    !uploading &&
    !!leaveStartDateTime &&
    !!leaveEndDateTime &&
    !!leaveTypeId &&
    !preview?.error &&
    !(needsAttachment && !documentUrl)

  // ── Handle final submit (DRAFT → PENDING) ─────────────────────────────────
  function handleConfirmSubmit() {
    if (!state.leaveRequestId) return
    setSubmitError(null)
    startSubmit(async () => {
      const result = await submitLeaveRequest(state.leaveRequestId!)
      if (result.success) {
        setSubmitMessage(result.message ?? 'ส่งคำขอลาเรียบร้อยแล้ว')
        setPhase('done')
      } else {
        setSubmitError(result.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่')
      }
    })
  }

  function handleStartOver() {
    setPhase('form')
    setSnapshot(null)
    setSubmitError(null)
    setLeaveTypeId('')
    setStartDate(today)
    setEndDate(today)
    setStartTime(DEFAULT_START_TIME)
    setEndTime(DEFAULT_END_TIME)
    setDocumentUrl('')
    setDocumentName('')
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Phase: Confirmation screen
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'confirm' && snapshot) {
    const startDT = new Date(snapshot.leaveStartDateTime)
    const endDT   = new Date(snapshot.leaveEndDateTime)
    const isSameDay = snapshot.leaveStartDateTime.slice(0, 10) === snapshot.leaveEndDateTime.slice(0, 10)
    const timeRange = isSameDay
      ? `${snapshot.leaveStartDateTime.slice(11, 16)} – ${snapshot.leaveEndDateTime.slice(11, 16)} น.`
      : `${snapshot.leaveStartDateTime.slice(11, 16)} น. – ${snapshot.leaveEndDateTime.slice(11, 16)} น.`
    return (
      <div className="max-w-xl mx-auto mt-10 bg-card rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-foreground mb-1">ยืนยันการส่งคำขอลา</h1>
        <p className="text-sm text-muted-foreground mb-6">ตรวจสอบรายละเอียดก่อนส่งคำขอ</p>

        {submitError && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            ⚠ {submitError}
          </div>
        )}

        {/* Summary card */}
        <div className="rounded-xl border border-border bg-muted/40 divide-y divide-border mb-6 text-sm">
          <Row label="ประเภทการลา" value={snapshot.leaveTypeName} />
          <Row
            label="วันที่"
            value={
              isSameDay
                ? formatDate(startDT)
                : `${formatDate(startDT)} – ${formatDate(endDT)}`
            }
          />
          <Row label="เวลา" value={timeRange} />
          <Row
            label="จำนวน"
            value={
              <span className="font-semibold text-base text-foreground">
                {snapshot.displayLabel}
              </span>
            }
          />
          {snapshot.reason && <Row label="เหตุผล" value={snapshot.reason} />}
          {snapshot.documentName && <Row label="เอกสารแนบ" value={snapshot.documentName} />}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleStartOver}
            disabled={submitPending}
            className="flex-1 py-2.5 border border-border text-foreground font-semibold rounded-lg hover:bg-muted/40 transition disabled:opacity-50"
          >
            กรอกใหม่
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={submitPending}
            className="flex-1 py-2.5 bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground font-semibold rounded-lg transition"
          >
            {submitPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                กำลังส่งคำขอ…
              </span>
            ) : (
              'ยืนยันส่งคำขอลา'
            )}
          </button>
        </div>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Phase: Done
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'done') {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-card rounded-2xl shadow-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">ส่งคำขอลาเรียบร้อยแล้ว</h2>
        <p className="text-sm text-muted-foreground mb-6">{submitMessage}</p>
        <button
          type="button"
          onClick={handleStartOver}
          className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition"
        >
          ยื่นคำขอลาใหม่
        </button>
      </div>
    )
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Phase: Form
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-xl mx-auto mt-10 bg-card rounded-2xl shadow-md p-8">
      <h1 className="text-2xl font-bold text-foreground mb-1">แบบฟอร์มขอลา</h1>
      <p className="text-sm text-muted-foreground mb-6">กรอกข้อมูลการลาและกดบันทึกร่าง จากนั้นยืนยันเพื่อส่งคำขอ</p>

      {state.errors?.general && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          ⚠ {state.errors.general}
        </div>
      )}

      <form action={handleFormAction} className="space-y-5">
        {/* Hidden datetime fields submitted to server */}
        <input type="hidden" name="leaveStartDateTime" value={leaveStartDateTime} />
        <input type="hidden" name="leaveEndDateTime"   value={leaveEndDateTime} />

        {/* Leave Type */}
        <div>
          <label htmlFor="leaveTypeId" className="block text-sm font-medium text-foreground mb-1">
            ประเภทการลา <span className="text-red-500">*</span>
          </label>
          <select
            id="leaveTypeId"
            name="leaveTypeId"
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}            required            className="w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="" disabled>-- เลือกประเภทการลา --</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name}
              </option>
            ))}
          </select>
          {state.errors?.leaveTypeId && (
            <p className="mt-1 text-xs text-red-500">{state.errors.leaveTypeId}</p>
          )}

          {/* Policy summary */}
          {selectedType && (
            <div className="mt-2 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">{selectedType.name}</p>
              <p>{buildPolicySummary(selectedType)}</p>
              {remainingQuota !== null && (
                <p className="font-medium">
                  คงเหลือสิทธิ์:{' '}
                  <span className={remainingQuota <= 1 ? 'text-red-600' : 'text-green-700'}>
                    {remainingQuota} วัน
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Start date + time */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            วันและเวลาเริ่มต้น <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="startDate" className="block text-xs text-muted-foreground mb-1">วันที่</label>
              <HolidayDatePicker
                id="startDate"
                name="startDate"
                value={startDate}
                min={today}
                onChange={setStartDate}
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-xs text-muted-foreground mb-1">เวลา</label>
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                min="09:30"
                max="17:30"
                step="900"
                className="w-full px-3 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>
          {state.errors?.leaveStartDateTime && (
            <p className="mt-1 text-xs text-red-500">{state.errors.leaveStartDateTime}</p>
          )}
        </div>

        {/* End date + time */}
        <div>
          <p className="text-sm font-medium text-foreground mb-2">
            วันและเวลาสิ้นสุด <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="endDate" className="block text-xs text-muted-foreground mb-1">วันที่</label>
              <HolidayDatePicker
                id="endDate"
                name="endDate"
                value={endDate}
                min={startDate || today}
                onChange={setEndDate}
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-xs text-muted-foreground mb-1">เวลา</label>
              <input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                min="09:30"
                max="17:30"
                step="900"
                className="w-full px-3 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>
          </div>
          {state.errors?.leaveEndDateTime && (
            <p className="mt-1 text-xs text-red-500">{state.errors.leaveEndDateTime}</p>
          )}
        </div>

        {/* Total Leave Duration — read-only display */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            จำนวนวันลาทั้งหมด
          </label>
          {preview?.error ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <span>⚠</span>
              <span>{preview.error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-foreground cursor-not-allowed select-none">
              <svg className="h-4 w-4 text-muted-foreground/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {preview ? (
                <span className="font-semibold text-base text-foreground">{preview.displayLabel}</span>
              ) : (
                <span className="text-muted-foreground/60">— เลือกวันที่และเวลาเพื่อคำนวณ —</span>
              )}
            </div>
          )}
        </div>

        {/* Attachment */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            เอกสารแนบ {needsAttachment && <span className="text-red-500">*</span>}
          </label>

          {documentUrl ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="flex-1 truncate text-green-800 font-medium">{documentName}</span>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="text-xs text-red-500 hover:text-red-700 transition shrink-0"
              >
                ลบ
              </button>
              <input type="hidden" name="documentUrl" value={documentUrl} />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-input rounded-lg hover:border-primary hover:bg-primary/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <svg className="h-6 w-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg className="h-6 w-6 text-muted-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <span className="text-sm text-muted-foreground">
                {uploading ? 'กำลังอัปโหลด…' : 'คลิกเพื่อแนบไฟล์'}
              </span>
              <span className="text-xs text-muted-foreground/60">PDF, JPG, PNG, DOCX · ไม่เกิน 10 MB</span>
            </button>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />

          {uploadError && <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>}
          {needsAttachment && !documentUrl && !uploading && (
            <p className="mt-1 text-xs text-amber-600">⚠ ประเภทการลานี้จำเป็นต้องแนบเอกสารประกอบ</p>
          )}
          {state.errors?.documentUrl && (
            <p className="mt-1 text-xs text-red-500">{state.errors.documentUrl}</p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-1">
            เหตุผล
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            placeholder="ระบุเหตุผลในการลา (ถ้ามี)"
            className="w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
          {state.errors?.reason && (
            <p className="mt-1 text-xs text-red-500">{state.errors.reason}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {pending ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              กำลังบันทึกร่าง...
            </span>
          ) : (
            'บันทึกร่างคำขอลา'
          )}
        </button>
      </form>
    </div>
  )
}

// ── Helper component ──────────────────────────────────────────────────────────

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="w-36 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium">{value}</span>    </div>
  )
}
