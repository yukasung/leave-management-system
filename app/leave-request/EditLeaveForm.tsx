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
import { useRouter } from 'next/navigation'
import { updateLeaveRequest, submitLeaveRequest, cancelLeaveRequest, type FormState } from './actions'
import { approveLeaveRequest, rejectLeaveRequest } from '@/app/manager/leave-requests/actions'
import { hrApproveLeaveRequest, hrRejectLeaveRequest, hrAdminCancelApproved, hrApproveCancellation } from '@/app/hr/leave-requests/actions'
import { calculateLeaveDuration, WORK_START_HOUR, WORK_START_MIN, WORK_END_HOUR, WORK_END_MIN } from '@/lib/leave-calc'
import { buildPolicySummary, type LeaveTypePolicy } from '@/lib/leave-policy-utils'
import HolidayDatePicker from '@/app/components/HolidayDatePicker'

// ── Types ─────────────────────────────────────────────────────────────────────

type BalanceInfo = { totalDays: number; usedDays: number }

type ApprovalRow = {
  level:        number
  status:       string
  approverName: string
}

type ExistingLeave = {
  leaveTypeId:        string
  leaveStartDateTime: string   // "YYYY-MM-DDTHH:mm"
  leaveEndDateTime:   string   // "YYYY-MM-DDTHH:mm"
  totalDays:          number
  reason:             string
  documentUrl:        string
  status:             string
  requesterName?:     string
  approvals?:         ApprovalRow[]
}

type Props = {
  leaveId:        string
  existing:       ExistingLeave
  leaveTypes:     LeaveTypePolicy[]
  balanceByType:  Record<string, BalanceInfo>
  usageByType:    Record<string, number>
  isEditable:     boolean
  isPrivileged:   boolean
  canApprove?:    boolean
  canAdminAction?: boolean
  backHref?:      string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_START_TIME = `${String(WORK_START_HOUR).padStart(2, '0')}:${String(WORK_START_MIN).padStart(2, '0')}`
const DEFAULT_END_TIME   = `${String(WORK_END_HOUR).padStart(2, '0')}:${String(WORK_END_MIN).padStart(2, '0')}`

const STATUS_BANNER: Record<string, { text: string; cls: string }> = {
  PENDING:          { text: 'คำขอลานี้อยู่ระหว่างรออนุมัติ — ไม่สามารถแก้ไขได้',  cls: 'bg-yellow-50 border-yellow-300 text-yellow-800' },
  IN_REVIEW:        { text: 'คำขอลานี้อยู่ระหว่างพิจารณา — ไม่สามารถแก้ไขได้',  cls: 'bg-blue-50 border-blue-300 text-blue-800' },
  APPROVED:         { text: 'คำขอลานี้ได้รับการอนุมัติแล้ว — ฟิลด์ถูกปิดใช้งาน', cls: 'bg-green-50 border-green-300 text-green-800' },
  REJECTED:         { text: 'คำขอลานี้ถูกปฏิเสธแล้ว — ไม่สามารถแก้ไขได้',       cls: 'bg-red-50 border-red-300 text-red-700' },
  CANCELLED:        { text: 'คำขอลานี้ถูกยกเลิกแล้ว — ไม่สามารถแก้ไขได้',       cls: 'bg-muted border-border text-muted-foreground' },
  CANCEL_REQUESTED: { text: 'คำขอยกเลิกอยู่ระหว่างรอ HR — ไม่สามารถแก้ไขได้',   cls: 'bg-orange-50 border-orange-300 text-orange-800' },
}

const HR_APPROVED_BANNER = {
  text: '⚠ คุณกำลังแก้ไขคำขอลาที่อนุมัติแล้วในฐานะ HR/Admin — ยอดคงเหลือจะถูกปรับอัตโนมัติ',
  cls: 'bg-amber-50 border-amber-400 text-amber-900',
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EditLeaveForm({
  leaveId, existing, leaveTypes, balanceByType, usageByType,
  isEditable, isPrivileged, canApprove, canAdminAction, backHref = '/my-leaves',
}: Props) {
  const boundAction = updateLeaveRequest.bind(null, leaveId)
  const [state, formAction, pending] = useActionState<FormState, FormData>(boundAction, {})
  const router = useRouter()
  const [submitting, startSubmitTransition] = useTransition()
  const [submitError, setSubmitError] = useState('')
  const [adminActionDone, setAdminActionDone] = useState<{ ok: boolean; label: string; msg: string } | null>(null)
  const [cancelPending, startCancelTransition] = useTransition()
  const [cancelDone, setCancelDone] = useState<{ ok: boolean; msg: string } | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  function handleSubmit() {
    setSubmitError('')
    startSubmitTransition(async () => {
      const result = await submitLeaveRequest(leaveId)
      if (result.success) {
        router.push('/leave-request')
        router.refresh()
      } else {
        setSubmitError(result.error ?? 'เกิดข้อผิดพลาด')
      }
    })
  }

  const today = new Date().toISOString().split('T')[0]

  const [leaveTypeId, setLeaveTypeId] = useState(existing.leaveTypeId)

  // Parse existing datetime strings (YYYY-MM-DDTHH:mm)
  const [startDate, setStartDate] = useState(
    existing.leaveStartDateTime ? existing.leaveStartDateTime.slice(0, 10) : today
  )
  const [startTime, setStartTime] = useState(
    existing.leaveStartDateTime?.slice(11, 16) || DEFAULT_START_TIME
  )
  const [endDate, setEndDate] = useState(
    existing.leaveEndDateTime ? existing.leaveEndDateTime.slice(0, 10) : today
  )
  const [endTime, setEndTime] = useState(
    existing.leaveEndDateTime?.slice(11, 16) || DEFAULT_END_TIME
  )

  const [documentUrl, setDocumentUrl]   = useState(existing.documentUrl)
  const [documentName, setDocumentName] = useState(
    existing.documentUrl ? existing.documentUrl.split('/').pop() ?? 'เอกสารแนบเดิม' : ''
  )
  const [uploading, setUploading]     = useState(false)
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

  const disabled = !isEditable

  // Auto-sync end date
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

  const selectedType = leaveTypes.find((lt) => lt.id === leaveTypeId) ?? null

  // Combined datetime strings
  const leaveStartDateTime = startDate && startTime ? `${startDate}T${startTime}` : ''
  const leaveEndDateTime   = endDate   && endTime   ? `${endDate}T${endTime}`     : ''

  const preview = (() => {
    if (!leaveStartDateTime || !leaveEndDateTime) return null
    return calculateLeaveDuration(
      new Date(leaveStartDateTime),
      new Date(leaveEndDateTime),
      holidaySet
    )
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
    !!leaveStartDateTime &&
    !!leaveEndDateTime &&
    !!leaveTypeId &&
    !preview?.error &&
    !(needsAttachment && !documentUrl)

  // ── Success screen ─────────────────────────────────────────────────────────
  if (state.success) {
    return (
      <div className="max-w-xl mx-auto mt-10 bg-card rounded-2xl shadow-md p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">อัปเดตคำขอลาเรียบร้อยแล้ว</h2>
        <p className="text-sm text-muted-foreground mb-4">{state.message}</p>
        {submitError && (
          <p className="mb-4 text-sm text-red-500">{submitError}</p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {existing.status === 'DRAFT' && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-60"
            >
              {submitting ? 'กำลังส่ง…' : 'ส่งคำขอลา'}
            </button>
          )}
          <Link
            href="/leave-request"
            className="inline-block px-6 py-2.5 border border-border bg-background hover:bg-muted text-foreground font-semibold rounded-lg transition"
          >
            กลับหน้ายื่นคำขอ
          </Link>
        </div>
      </div>
    )
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  const banner = !isEditable
    ? STATUS_BANNER[existing.status]
    : isPrivileged && existing.status === 'APPROVED'
    ? HR_APPROVED_BANNER
    : null

  // ── Read-only detail view (non-editable) ───────────────────────────────────
  if (!isEditable) {
    const selectedTypeName = leaveTypes.find((lt) => lt.id === existing.leaveTypeId)?.name ?? '—'

    const formatDT = (dt: string) => {
      if (!dt) return '—'
      const [datePart, timePart] = dt.split('T')
      if (!datePart) return { date: '—', time: '' }
      const [y, m, d] = datePart.split('-').map(Number)
      const MONTHS = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
      return { date: `${d} ${MONTHS[m - 1]} ${y + 543}`, time: timePart ? `${timePart} น.` : '' }
    }
    const startDT = formatDT(existing.leaveStartDateTime)
    const endDT   = formatDT(existing.leaveEndDateTime)
    const totalDaysStr = preview?.displayLabel ?? `${parseFloat(Number(existing.totalDays).toFixed(2))} วัน`
    const fileName = existing.documentUrl ? existing.documentUrl.split('/').pop() ?? 'ดูเอกสาร' : null

    // Timeline steps config
    type StepStatus = 'done' | 'active' | 'pending' | 'error'
    const TIMELINE_STEPS: { label: string; key: string; icon: string }[] = [
      { key: 'SUBMITTED', label: 'ยื่นคำขอ',    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
      { key: 'PENDING',   label: 'รออนุมัติ',   icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
      { key: 'IN_REVIEW', label: 'พิจารณา',     icon: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
      { key: 'RESULT',    label: 'ผลลัพธ์',     icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    ]

    const getStepStatus = (key: string): StepStatus => {
      const s = existing.status
      if (key === 'SUBMITTED') return 'done'
      if (key === 'PENDING') {
        if (s === 'PENDING') return 'active'
        return 'done'
      }
      if (key === 'IN_REVIEW') {
        if (s === 'IN_REVIEW') return 'active'
        if (s === 'PENDING') return 'pending'
        return 'done'
      }
      if (key === 'RESULT') {
        if (s === 'APPROVED') return 'done'
        if (s === 'REJECTED' || s === 'CANCELLED') return 'error'
        if (s === 'CANCEL_REQUESTED') return 'active'
        return 'pending'
      }
      return 'pending'
    }

    const RESULT_LABELS: Record<string, string> = {
      APPROVED: 'อนุมัติ', REJECTED: 'ไม่อนุมัติ',
      CANCELLED: 'ยกเลิก', CANCEL_REQUESTED: 'รอยกเลิก', IN_REVIEW: 'ผลลัพธ์', PENDING: 'ผลลัพธ์',
    }
    const stepLabel = (key: string) => key === 'RESULT'
      ? (RESULT_LABELS[existing.status] ?? 'ผลลัพธ์') : TIMELINE_STEPS.find(s => s.key === key)?.label ?? ''

    const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
      DRAFT:            { label: 'ร่าง',              cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
      PENDING:          { label: 'รออนุมัติ',          cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
      IN_REVIEW:        { label: 'กำลังพิจารณา',       cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
      APPROVED:         { label: 'อนุมัติแล้ว',        cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' },
      REJECTED:         { label: 'ปฏิเสธแล้ว',         cls: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
      CANCELLED:        { label: 'ยกเลิกแล้ว',         cls: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' },
      CANCEL_REQUESTED: { label: 'รอยืนยันยกเลิก',    cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400' },
    }
    const statusBadge = STATUS_BADGE[existing.status]

    const stepColorClass = (status: StepStatus) => ({
      done:    'bg-emerald-500 border-emerald-500 text-white',
      active:  'bg-primary border-primary text-primary-foreground',
      pending: 'bg-background border-border text-muted-foreground',
      error:   'bg-red-500 border-red-500 text-white',
    }[status])

    const lineColorClass = (fromKey: string): string => {
      const from = getStepStatus(fromKey)
      return from === 'done' ? 'bg-emerald-400' : from === 'active' ? 'bg-primary/40' : 'bg-border'
    }

    return (
      <div className="max-w-lg mx-auto mt-8 space-y-4">
        {/* Card */}
        <div className="bg-card rounded-2xl shadow-md border border-border overflow-hidden">

          {/* Header */}
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <svg className="h-4 w-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h1 className="text-base font-bold text-foreground">รายละเอียดคำขอลา</h1>
              {statusBadge && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadge.cls}`}>
                  {statusBadge.label}
                </span>
              )}
            </div>
            <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              ย้อนกลับ
            </Link>
          </div>

          {/* Horizontal Timeline — hidden for approvers and admins */}
          {!canApprove && !isPrivileged && (
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center">
                {TIMELINE_STEPS.map((step, idx) => {
                  const status = getStepStatus(step.key)
                  const isLast = idx === TIMELINE_STEPS.length - 1
                  return (
                    <div key={step.key} className="flex items-center flex-1 last:flex-none">
                      <div className="flex flex-col items-center gap-1.5 min-w-0">
                        <div className={`h-9 w-9 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${stepColorClass(status)}`}>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={step.icon} />
                          </svg>
                        </div>
                        <span className={`text-[11px] font-medium text-center leading-tight whitespace-nowrap ${
                          status === 'done' ? 'text-emerald-600 dark:text-emerald-400'
                          : status === 'active' ? 'text-primary font-semibold'
                          : status === 'error' ? 'text-red-500'
                          : 'text-muted-foreground'
                        }`}>
                          {stepLabel(step.key)}
                        </span>
                      </div>
                      {!isLast && (
                        <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full transition-all ${lineColorClass(step.key)}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="h-px bg-border mx-6" />

          {/* Info rows */}
          <div className="px-6 py-5 space-y-3">
            {/* Requester — visible to privileged users only */}
            {isPrivileged && existing.requesterName && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                <div className="h-8 w-8 rounded-lg bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-sky-600 dark:text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">ผู้ขอลา</p>
                  <p className="text-sm font-semibold text-foreground">{existing.requesterName}</p>
                </div>
              </div>
            )}

            {/* Leave type */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-violet-600 dark:text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">ประเภทการลา</p>
                <p className="text-sm font-semibold text-foreground truncate">{selectedTypeName}</p>
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">วันที่เริ่ม</p>
                  <p className="text-sm font-semibold text-foreground">{startDT.date}</p>
                  {startDT.time && <p className="text-xs text-muted-foreground">{startDT.time}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">วันที่สิ้นสุด</p>
                  <p className="text-sm font-semibold text-foreground">{endDT.date}</p>
                  {endDT.time && <p className="text-xs text-muted-foreground">{endDT.time}</p>}
                </div>
              </div>
            </div>

            {/* Total days */}
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                <svg className="h-4 w-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">จำนวนวันลา</p>
                <p className="text-sm font-semibold text-foreground">{totalDaysStr}</p>
              </div>
            </div>

            {/* Reason */}
            <div className="flex items-start gap-3 rounded-xl bg-muted/40 px-4 py-3">
              <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center shrink-0 mt-0.5">
                <svg className="h-4 w-4 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground mb-0.5">เหตุผล</p>
                <p className="text-sm font-medium text-foreground wrap-break-word">
                  {existing.reason || <span className="text-muted-foreground/50 font-normal">ไม่ระบุ</span>}
                </p>
              </div>
            </div>

            {/* Approvers — visible to privileged users only */}
            {isPrivileged && existing.approvals && existing.approvals.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl bg-muted/40 px-4 py-3">
                <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/40 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground mb-2">ผู้อนุมัติ</p>
                  <div className="space-y-1.5">
                    {existing.approvals.map((a) => {
                      const badgeCls =
                        a.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                        : a.status === 'REJECTED' ? 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400'
                        : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400'
                      const badgeLabel =
                        a.status === 'APPROVED' ? 'อนุมัติ'
                        : a.status === 'REJECTED' ? 'ปฏิเสธ'
                        : 'รออนุมัติ'
                      return (
                        <div key={a.level} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">{a.approverName}</span>
                          </div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${badgeCls}`}>
                            {badgeLabel}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Attachment */}
            {fileName ? (
              <a
                href={existing.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 px-4 py-3 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors group"
              >
                <div className="h-8 w-8 rounded-lg bg-emerald-200 dark:bg-emerald-900/60 flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-emerald-700 dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">เอกสารแนบ</p>
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200 truncate group-hover:underline">{fileName}</p>
                </div>
                <svg className="h-4 w-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            ) : (
              <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-4 py-3">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <svg className="h-4 w-4 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">เอกสารแนบ</p>
                  <p className="text-sm text-muted-foreground/50">ไม่มีเอกสาร</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-background border border-border text-foreground text-sm font-semibold rounded-lg hover:bg-muted transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              ย้อนกลับ
            </Link>
            {canApprove && (
              <ApproveRejectButtons leaveId={leaveId} />
            )}
            {adminActionDone ? (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                adminActionDone.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'
              }`}>
                {adminActionDone.ok ? (
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                {adminActionDone.ok ? `${adminActionDone.label}เรียบร้อยแล้ว` : adminActionDone.msg}
              </div>
            ) : canAdminAction && (
              <AdminActionButtons leaveId={leaveId} status={existing.status} onDone={setAdminActionDone} />
            )}

            {/* Employee: request cancellation (non-privileged, non-approver) */}
            {!isPrivileged && !canApprove && (['PENDING', 'IN_REVIEW', 'APPROVED'].includes(existing.status) || cancelDone) && (
              cancelDone ? (
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${
                  cancelDone.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'
                }`}>
                  {cancelDone.ok ? (
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {cancelDone.msg}
                </div>
              ) : cancelConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">ยืนยันขอยกเลิก?</span>
                  <button
                    type="button"
                    onClick={() => setCancelConfirm(false)}
                    className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition"
                  >
                    ไม่
                  </button>
                  <button
                    type="button"
                    disabled={cancelPending}
                    onClick={() => startCancelTransition(async () => {
                      const res = await cancelLeaveRequest(leaveId)
                      if (res.error) {
                        setCancelDone({ ok: false, msg: res.error })
                      } else {
                        setCancelDone({ ok: true, msg: res.message ?? 'ส่งคำขอยกเลิกแล้ว' })
                      }
                      setCancelConfirm(false)
                    })}
                    className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {cancelPending ? 'กำลังส่ง…' : 'ยืนยัน'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCancelConfirm(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 text-red-700 dark:text-red-400 text-sm font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-950/50 transition"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  ขอยกเลิก
                </button>
              )
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto mt-10 bg-card rounded-2xl shadow-md p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-foreground">แก้ไขคำขอลา</h1>
        <Link href="/my-leaves" className="text-sm text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300">
          ← ย้อนกลับ
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-5">แก้ไขรายละเอียดการลาและกดบันทึก</p>

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
            onChange={(e) => setLeaveTypeId(e.target.value)}
            disabled={disabled}            required            className="w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
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
                min={disabled ? undefined : today}
                onChange={setStartDate}
                disabled={disabled}
              />
            </div>
            <div>
              <label htmlFor="startTime" className="block text-xs text-muted-foreground mb-1">เวลา</label>
              <input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={disabled}
                min="09:30"
                max="17:30"
                step="900"
                className="w-full px-3 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-sm"
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
                min={disabled ? undefined : (startDate || today)}
                onChange={setEndDate}
                disabled={disabled}
              />
            </div>
            <div>
              <label htmlFor="endTime" className="block text-xs text-muted-foreground mb-1">เวลา</label>
              <input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={disabled}
                min="09:30"
                max="17:30"
                step="900"
                className="w-full px-3 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed text-sm"
              />
            </div>
          </div>
          {state.errors?.leaveEndDateTime && (
            <p className="mt-1 text-xs text-red-500">{state.errors.leaveEndDateTime}</p>
          )}
        </div>

        {/* Days / hours preview */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            จำนวนวันลาทั้งหมด
          </label>
          {preview?.error ? (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <span>⚠</span><span>{preview.error}</span>
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
          ) : (
            <div className="px-4 py-2.5 bg-muted border border-border rounded-lg text-sm text-muted-foreground/60">
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
          <label htmlFor="reason" className="block text-sm font-medium text-foreground mb-1">
            เหตุผล
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            placeholder="ระบุเหตุผลในการลา (ถ้ามี)"
            defaultValue={existing.reason}
            disabled={disabled}
            className="w-full px-4 py-2.5 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
          />
          {state.errors?.reason && (
            <p className="mt-1 text-xs text-red-500">{state.errors.reason}</p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-1">
          <Link
            href="/my-leaves"
            className="flex-1 py-2.5 border border-border text-foreground font-semibold rounded-lg hover:bg-muted/40 transition text-center"
          >
            ยกเลิก
          </Link>
          {isEditable && (
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
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

// ── Approve / Reject buttons for approver view ────────────────────────────────

function ApproveRejectButtons({ leaveId }: { leaveId: string }) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; label: string; msg: string } | null>(null)

  function handle(action: (id: string) => Promise<{ success: boolean; message?: string }>, label: string) {
    setResult(null)
    startTransition(async () => {
      const res = await action(leaveId)
      setResult({ ok: res.success, label, msg: res.message ?? (res.success ? 'ดำเนินการสำเร็จ' : 'เกิดข้อผิดพลาด') })
    })
  }

  if (result) {
    return (
      <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold ${result.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-600'}`}>
        {result.ok ? (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {result.ok ? `${result.label}เรียบร้อยแล้ว` : result.msg}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        disabled={isPending}
        onClick={() => handle(approveLeaveRequest, 'อนุมัติ')}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {isPending ? (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        อนุมัติ
      </button>
      <button
        disabled={isPending}
        onClick={() => handle(rejectLeaveRequest, 'ไม่อนุมัติ')}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {isPending ? (
          <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        ) : (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        ไม่อนุมัติ
      </button>
    </div>
  )
}

// ── Admin action buttons (HR/Admin only) ──────────────────────────────────────
function AdminActionButtons({ leaveId, status, onDone }: {
  leaveId: string
  status: string
  onDone: (result: { ok: boolean; label: string; msg: string }) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [confirmCancel, setConfirmCancel] = useState(false)

  function handle(action: (id: string) => Promise<{ success: boolean; message?: string }>, label: string) {
    startTransition(async () => {
      const res = await action(leaveId)
      onDone({ ok: res.success, label, msg: res.message ?? (res.success ? 'ดำเนินการสำเร็จ' : 'เกิดข้อผิดพลาด') })
    })
  }

  const Spinner = () => (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  )

  // APPROVED — only cancel (with confirm)
  if (status === 'APPROVED') {
    if (confirmCancel) {
      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground font-medium">ยืนยันการยกเลิก?</span>
          <button
            disabled={isPending}
            onClick={() => handle(hrAdminCancelApproved, 'ยกเลิก')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
          >
            {isPending ? <Spinner /> : 'ยืนยัน'}
          </button>
          <button
            disabled={isPending}
            onClick={() => setConfirmCancel(false)}
            className="inline-flex items-center px-4 py-2 bg-background border border-border text-foreground text-sm font-semibold rounded-lg hover:bg-muted transition disabled:opacity-50"
          >
            ยกเลิก
          </button>
        </div>
      )
    }
    return (
      <button
        disabled={isPending}
        onClick={() => setConfirmCancel(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
        ยกเลิก
      </button>
    )
  }

  // CANCEL_REQUESTED — approve cancellation
  if (status === 'CANCEL_REQUESTED') {
    return (
      <button
        disabled={isPending}
        onClick={() => handle(hrApproveCancellation, 'อนุมัติยกเลิก')}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {isPending ? <Spinner /> : (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        อนุมัติยกเลิก
      </button>
    )
  }

  // PENDING / IN_REVIEW — approve, reject, cancel
  return (
    <div className="flex items-center gap-2">
      <button
        disabled={isPending}
        onClick={() => handle(hrApproveLeaveRequest, 'อนุมัติ')}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {isPending ? <Spinner /> : (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
        อนุมัติ
      </button>
      <button
        disabled={isPending}
        onClick={() => handle(hrRejectLeaveRequest, 'ปฏิเสธ')}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {isPending ? <Spinner /> : (
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        )}
        ไม่อนุมัติ
      </button>
    </div>
  )
}
