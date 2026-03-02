'use client'

import { useActionState, useState, useEffect, useRef, useTransition } from 'react'
import { createLeaveRequest, submitLeaveRequest, type FormState } from './actions'
import { calculateLeaveDays, type LeaveDurationType } from '@/lib/leave-calc'
import { buildPolicySummary, type LeaveTypePolicy } from '@/lib/leave-policy-utils'
import { formatDate } from '@/lib/format-date'

type BalanceInfo = { totalDays: number; usedDays: number }

type Props = {
  leaveTypes: LeaveTypePolicy[]
  balanceByType: Record<string, BalanceInfo>
  usageByType: Record<string, number>
}

const initialState: FormState = {}

const DURATION_OPTIONS: { value: LeaveDurationType; label: string }[] = [
  { value: 'FULL_DAY', label: 'เต็มวัน' },
  { value: 'HALF_DAY_MORNING', label: 'ครึ่งวันเช้า (08:00 – 12:00)' },
  { value: 'HALF_DAY_AFTERNOON', label: 'ครึ่งวันบ่าย (13:00 – 17:00)' },
]

const DURATION_LABEL: Record<LeaveDurationType, string> = {
  FULL_DAY: 'เต็มวัน',
  HALF_DAY_MORNING: 'ครึ่งวันเช้า',
  HALF_DAY_AFTERNOON: 'ครึ่งวันบ่าย',
}

export default function LeaveRequestForm({ leaveTypes, balanceByType, usageByType }: Props) {
  const [state, formAction, pending] = useActionState(createLeaveRequest, initialState)

  // ── Two-step flow state ────────────────────────────────────────────────────
  type Phase = 'form' | 'confirm' | 'done'
  const [phase, setPhase] = useState<Phase>('form')
  const [submitPending, startSubmit] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  // Snapshot of form values for the confirmation screen
  const [snapshot, setSnapshot] = useState<{
    leaveTypeName: string
    startDate: string
    endDate: string
    startDurationType: LeaveDurationType
    endDurationType: LeaveDurationType
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
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [startDurationType, setStartDurationType] = useState<LeaveDurationType>('FULL_DAY')
  const [endDurationType, setEndDurationType] = useState<LeaveDurationType>('FULL_DAY')
  const [documentUrl, setDocumentUrl] = useState('')
  const [documentName, setDocumentName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const selectedType = leaveTypes.find((lt) => lt.id === leaveTypeId) ?? null
  const isMultiDay = startDate !== '' && endDate !== '' && startDate !== endDate

  // Auto-sync end date if it goes before start
  useEffect(() => {
    if (startDate && endDate && endDate < startDate) setEndDate(startDate)
  }, [startDate, endDate])

  // Live preview
  const preview = (() => {
    if (!startDate || !endDate) return null
    return calculateLeaveDays(new Date(startDate), new Date(endDate), startDurationType, endDurationType)
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
        leaveTypeName: selectedType?.name ?? '',
        startDate,
        endDate,
        startDurationType,
        endDurationType: isMultiDay ? endDurationType : startDurationType,
        totalDays: preview.totalDays,
        reason: (formData.get('reason') as string) || '',
        documentName,
      })
    }
    formAction(formData)
  }

  const canSubmit =
    !pending &&
    !uploading &&
    !!startDate &&
    !!endDate &&
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
    setStartDurationType('FULL_DAY')
    setEndDurationType('FULL_DAY')
    setDocumentUrl('')
    setDocumentName('')
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Phase: Confirmation screen
  // ════════════════════════════════════════════════════════════════════════════
  if (phase === 'confirm' && snapshot) {
    const isSameDay = snapshot.startDate === snapshot.endDate
    return (
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">ยืนยันการส่งคำขอลา</h1>
        <p className="text-sm text-gray-500 mb-6">ตรวจสอบรายละเอียดก่อนส่งคำขอ</p>

        {submitError && (
          <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
            ⚠ {submitError}
          </div>
        )}

        {/* Summary card */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 divide-y divide-gray-100 mb-6 text-sm">
          <Row label="ประเภทการลา" value={snapshot.leaveTypeName} />
          <Row
            label="วันที่"
            value={
              isSameDay
                ? formatDate(new Date(snapshot.startDate))
                : `${formatDate(new Date(snapshot.startDate))} – ${formatDate(new Date(snapshot.endDate))}`
            }
          />
          <Row label="ช่วงเวลาวันแรก" value={DURATION_LABEL[snapshot.startDurationType]} />
          {!isSameDay && (
            <Row label="ช่วงเวลาวันสุดท้าย" value={DURATION_LABEL[snapshot.endDurationType]} />
          )}
          <Row
            label="จำนวนวันลา"
            value={
              <span className="font-semibold text-base text-gray-900">
                {snapshot.totalDays} วันทำการ
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
            className="flex-1 py-2.5 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
          >
            กรอกใหม่
          </button>
          <button
            type="button"
            onClick={handleConfirmSubmit}
            disabled={submitPending}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition"
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
      <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl shadow-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">ส่งคำขอลาเรียบร้อยแล้ว</h2>
        <p className="text-sm text-gray-500 mb-6">{submitMessage}</p>
        <button
          type="button"
          onClick={handleStartOver}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition"
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
    <div className="max-w-xl mx-auto mt-10 bg-white rounded-2xl shadow-md p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">แบบฟอร์มขอลา</h1>
      <p className="text-sm text-gray-500 mb-6">กรอกข้อมูลการลาและกดบันทึกร่าง จากนั้นยืนยันเพื่อส่งคำขอ</p>

      {state.errors?.general && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          ⚠ {state.errors.general}
        </div>
      )}

      <form action={handleFormAction} className="space-y-5">
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
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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

        {/* Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              วันที่เริ่มต้น <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              min={today}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state.errors?.startDate && (
              <p className="mt-1 text-xs text-red-500">{state.errors.startDate}</p>
            )}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              วันที่สิ้นสุด <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              min={startDate || today}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {state.errors?.endDate && (
              <p className="mt-1 text-xs text-red-500">{state.errors.endDate}</p>
            )}
          </div>
        </div>

        {/* Duration type — separate for start and end */}
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
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          {isMultiDay && (
          <div>
            <label htmlFor="endDurationType" className="block text-sm font-medium text-gray-700 mb-1">
              ช่วงเวลาวันสุดท้าย
            </label>
            <select
              id="endDurationType"
              name="endDurationType"
              value={endDurationType}
              onChange={(e) => setEndDurationType(e.target.value as LeaveDurationType)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          )}
          {!isMultiDay && (
            <input type="hidden" name="endDurationType" value={startDurationType} />
          )}
        </div>

        {/* Total Leave Days — read-only display */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            จำนวนวันลาทั้งหมด
          </label>
          {preview?.error ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <span>⚠</span>
              <span>{preview.error}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-700 cursor-not-allowed select-none">
              <svg className="h-4 w-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {preview ? (
                <span>
                  <strong className="text-base text-gray-900">{preview.totalDays}</strong>{' '}
                  วันทำการ
                </span>
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
            /* Uploaded — show file name + remove */
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
            /* Picker */
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
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
            เหตุผล
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            placeholder="ระบุเหตุผลในการลา (ถ้ามี)"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {state.errors?.reason && (
            <p className="mt-1 text-xs text-red-500">{state.errors.reason}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
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
      <span className="w-36 shrink-0 text-gray-500">{label}</span>
      <span className="text-gray-900 font-medium">{value}</span>    </div>
  )
}