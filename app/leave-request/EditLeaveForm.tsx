'use client'

/**
 * EditLeaveForm — pre-populated form for editing an existing leave request.
 *
 * Behaviour:
 *  isEditable=true   → all fields are interactive; save button active
 *  isEditable=false  → all fields are disabled (read-only view); banner shown
 *
 * After a successful save the component shows an inline success notice and
 * offers a link back to "ประวัติการลาของฉัน".
 */

import { useActionState, useState, useEffect, useRef, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { updateLeaveRequest, type FormState } from './actions'
import { calculateLeaveDays, type LeaveDurationType } from '@/lib/leave-calc'
import { buildPolicySummary, type LeaveTypePolicy } from '@/lib/leave-policy-utils'
import { formatDate } from '@/lib/format-date'
import HolidayDatePicker from '@/app/components/HolidayDatePicker'

// ── Types ─────────────────────────────────────────────────────────────────────

type BalanceInfo = { totalDays: number; usedDays: number }

type ExistingLeave = {
  leaveTypeId:       string
  startDate:         string   // YYYY-MM-DD
  endDate:           string   // YYYY-MM-DD
  startDurationType: LeaveDurationType
  endDurationType:   LeaveDurationType
  totalDays:         number
  reason:            string
  documentUrl:       string
  status:            string
}

type Props = {
  leaveId:        string
  existing:       ExistingLeave
  leaveTypes:     LeaveTypePolicy[]
  balanceByType:  Record<string, BalanceInfo>
  usageByType:    Record<string, number>
  isEditable:     boolean   // false ⇒ all fields disabled (read-only view)
  isPrivileged:   boolean   // true ⇒ HR/ADMIN editing an APPROVED leave
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DURATION_OPTIONS: { value: LeaveDurationType; label: string }[] = [
  { value: 'FULL_DAY',          label: 'เต็มวัน' },
  { value: 'HALF_DAY_MORNING',  label: 'ครึ่งวันเช้า (08:00 – 12:00)' },
  { value: 'HALF_DAY_AFTERNOON', label: 'ครึ่งวันบ่าย (13:00 – 17:00)' },
]

const STATUS_BANNER: Record<string, { text: string; cls: string }> = {
  PENDING:          { text: 'คำขอลานี้อยู่ระหว่างรออนุมัติ — ไม่สามารถแก้ไขได้',  cls: 'bg-yellow-50 border-yellow-300 text-yellow-800' },
  IN_REVIEW:        { text: 'คำขอลานี้อยู่ระหว่างพิจารณา — ไม่สามารถแก้ไขได้',  cls: 'bg-blue-50 border-blue-300 text-blue-800' },
  APPROVED:         { text: 'คำขอลานี้ได้รับการอนุมัติแล้ว — ฟิลด์ถูกปิดใช้งาน', cls: 'bg-green-50 border-green-300 text-green-800' },
  REJECTED:         { text: 'คำขอลานี้ถูกปฏิเสธแล้ว — ไม่สามารถแก้ไขได้',       cls: 'bg-red-50 border-red-300 text-red-700' },
  CANCELLED:        { text: 'คำขอลานี้ถูกยกเลิกแล้ว — ไม่สามารถแก้ไขได้',       cls: 'bg-gray-100 border-gray-300 text-gray-600' },
  CANCEL_REQUESTED: { text: 'คำขอยกเลิกอยู่ระหว่างรอ HR — ไม่สามารถแก้ไขได้',   cls: 'bg-orange-50 border-orange-300 text-orange-800' },
}

const HR_APPROVED_BANNER = {
  text: '⚠ คุณกำลังแก้ไขคำขอลาที่อนุมัติแล้วในฐานะ HR/Admin — ยอดคงเหลือจะถูกปรับอัตโนมัติ',
  cls: 'bg-amber-50 border-amber-400 text-amber-900',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditLeaveForm({
  leaveId, existing, leaveTypes, balanceByType, usageByType,
  isEditable, isPrivileged,
}: Props) {
  // Bind leaveId into the action
  const boundAction = updateLeaveRequest.bind(null, leaveId)
  const [state, formAction, pending] = useActionState<FormState, FormData>(boundAction, {})

  const today = new Date().toISOString().split('T')[0]

  const [leaveTypeId, setLeaveTypeId]         = useState(existing.leaveTypeId)
  const [startDate, setStartDate]             = useState(existing.startDate)
  const [endDate, setEndDate]                 = useState(existing.endDate)
  const [startDurationType, setStartDurationType] = useState<LeaveDurationType>(existing.startDurationType)
  const [endDurationType, setEndDurationType]     = useState<LeaveDurationType>(existing.endDurationType)
  const [documentUrl, setDocumentUrl]         = useState(existing.documentUrl)
  const [documentName, setDocumentName]       = useState(
    existing.documentUrl ? existing.documentUrl.split('/').pop() ?? 'เอกสารแนบเดิม' : ''
  )
  const [uploading, setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState('')
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
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const years = new Set<number>()
    if (startDate) years.add(new Date(startDate + 'T00:00:00').getFullYear())
    if (endDate)   years.add(new Date(endDate   + 'T00:00:00').getFullYear())
    years.forEach(fetchHolidaysForYear)
  }, [startDate, endDate, fetchHolidaysForYear])

  const [_submitPending, startSaveTransition] = useTransition()

  const disabled = !isEditable

  // Auto-sync end date
  useEffect(() => {
    if (startDate && endDate && endDate < startDate) setEndDate(startDate)
  }, [startDate, endDate])

  const selectedType = leaveTypes.find((lt) => lt.id === leaveTypeId) ?? null
  const isMultiDay   = startDate !== '' && endDate !== '' && startDate !== endDate

  const preview = (() => {
    if (!startDate || !endDate) return null
    return calculateLeaveDays(new Date(startDate), new Date(endDate), startDurationType, endDurationType, holidaySet)
  })()

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

  const canSave =
    isEditable &&
    !pending &&
    !uploading &&
    !!startDate &&
    !!endDate &&
    !!leaveTypeId &&
    !preview?.error &&
    !(needsAttachment && !documentUrl)

  // ── Success screen ─────────────────────────────────────────────────────────
  if (state.success) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl shadow-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">อัปเดตคำขอลาเรียบร้อยแล้ว</h2>
        <p className="text-sm text-gray-500 mb-6">{state.message}</p>
        <Link
          href="/my-leaves"
          className="inline-block px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
        >
          กลับประวัติการลา
        </Link>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  // Banner to show when not editable
  const banner = !isEditable
    ? STATUS_BANNER[existing.status]
    : isPrivileged && existing.status === 'APPROVED'
    ? HR_APPROVED_BANNER
    : null

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl shadow-md p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-gray-800">
          {isEditable ? 'แก้ไขคำขอลา' : 'รายละเอียดคำขอลา'}
        </h1>
        <Link href="/my-leaves" className="text-sm text-blue-600 hover:underline">
          ← ย้อนกลับ
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-5">
        {isEditable ? 'แก้ไขรายละเอียดการลาและกดบันทึก' : 'คำขอลานี้ไม่สามารถแก้ไขได้ในขณะนี้'}
      </p>

      {/* Status / warning banner */}
      {banner && (
        <div className={`mb-5 px-4 py-3 border rounded-lg text-sm font-medium ${banner.cls}`}>
          {banner.text}
        </div>
      )}

      {/* Server error */}
      {state.errors?.general && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          ⚠ {state.errors.general}
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* Leave Type */}
        <div>
          <label htmlFor="leaveTypeId" className="block text-sm font-medium text-gray-700 mb-1">
            ประเภทการลา <span className="text-red-500">*</span>
          </label>
          <select
            id="leaveTypeId"
            name="leaveTypeId"
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          >
            <option value="" disabled>-- เลือกประเภทการลา --</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>{lt.name}</option>
            ))}
          </select>
          {state.errors?.leaveTypeId && (
            <p className="mt-1 text-xs text-red-500">{state.errors.leaveTypeId}</p>
          )}
          {selectedType && isEditable && (
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

        {/* Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              วันที่เริ่มต้น <span className="text-red-500">*</span>
            </label>
            <HolidayDatePicker
              id="startDate"
              name="startDate"
              value={startDate}
              min={disabled ? undefined : today}
              onChange={setStartDate}
              disabled={disabled}
            />
            {state.errors?.startDate && (
              <p className="mt-1 text-xs text-red-500">{state.errors.startDate}</p>
            )}
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              วันที่สิ้นสุด <span className="text-red-500">*</span>
            </label>
            <HolidayDatePicker
              id="endDate"
              name="endDate"
              value={endDate}
              min={disabled ? undefined : (startDate || today)}
              onChange={setEndDate}
              disabled={disabled}
            />
            {state.errors?.endDate && (
              <p className="mt-1 text-xs text-red-500">{state.errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Duration types */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDurationType" className="block text-sm font-medium text-gray-700 mb-1">
              ช่วงเวลาวันแรก
            </label>
            <select
              id="startDurationType"
              name="startDurationType"
              value={startDurationType}
              onChange={(e) => setStartDurationType(e.target.value as LeaveDurationType)}
              disabled={disabled}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {isMultiDay ? (
            <div>
              <label htmlFor="endDurationType" className="block text-sm font-medium text-gray-700 mb-1">
                ช่วงเวลาวันสุดท้าย
              </label>
              <select
                id="endDurationType"
                name="endDurationType"
                value={endDurationType}
                onChange={(e) => setEndDurationType(e.target.value as LeaveDurationType)}
                disabled={disabled}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="endDurationType" value={startDurationType} />
          )}
        </div>

        {/* Days preview */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนวันลาทั้งหมด
          </label>
          {preview?.error ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <span>⚠</span><span>{preview.error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 cursor-not-allowed select-none">
              <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {preview ? (
                <span><strong className="text-base text-gray-900">{preview.totalDays}</strong> วันทำการ</span>
              ) : (
                <span className="text-gray-400">— เลือกวันที่เพื่อคำนวณ —</span>
              )}
            </div>
          )}
        </div>

        {/* Attachment */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            เอกสารแนบ {needsAttachment && <span className="text-red-500">*</span>}
          </label>

          {documentUrl ? (
            <div className="flex items-center gap-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm">
              <svg className="h-5 w-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span className="flex-1 truncate text-green-800 font-medium">{documentName}</span>
              {isEditable && (
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="text-xs text-red-500 hover:text-red-700 transition shrink-0"
                >
                  ลบ
                </button>
              )}
              <input type="hidden" name="documentUrl" value={documentUrl} />
            </div>
          ) : isEditable ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full flex flex-col items-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <svg className="h-6 w-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
              ) : (
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
              <span className="text-sm text-gray-500">
                {uploading ? 'กำลังอัปโหลด…' : 'คลิกเพื่อแนบไฟล์'}
              </span>
              <span className="text-xs text-gray-400">PDF, JPG, PNG, DOCX · ไม่เกิน 10 MB</span>
            </button>
          ) : (
            <div className="px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-400">
              ไม่มีเอกสารแนบ
            </div>
          )}

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          {uploadError && <p className="mt-1.5 text-xs text-red-500">{uploadError}</p>}
          {needsAttachment && !documentUrl && !uploading && isEditable && (
            <p className="mt-1 text-xs text-amber-600">⚠ ประเภทการลานี้จำเป็นต้องแนบเอกสารประกอบ</p>
          )}
          {state.errors?.documentUrl && (
            <p className="mt-1 text-xs text-red-500">{state.errors.documentUrl}</p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            เหตุผล
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            placeholder="ระบุเหตุผลในการลา (ถ้ามี)"
            defaultValue={existing.reason}
            disabled={disabled}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
          />
          {state.errors?.reason && (
            <p className="mt-1 text-xs text-red-500">{state.errors.reason}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <Link
            href="/my-leaves"
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition text-center"
          >
            ยกเลิก
          </Link>
          {isEditable && (
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  กำลังบันทึก…
                </span>
              ) : (
                'บันทึกการแก้ไข'
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
