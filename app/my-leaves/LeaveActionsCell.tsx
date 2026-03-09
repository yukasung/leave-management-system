'use client'

/**
 * Action buttons for a single leave row in "My Leaves" table.
 *
 * Business rules:
 *   DRAFT            → [แก้ไข]  [ลบร่าง]
 *   PENDING          → [ยกเลิก]
 *   IN_REVIEW        → [ยกเลิก]
 *   APPROVED         → [ขอยกเลิก]    (flags for HR review)
 *   CANCEL_REQUESTED → disabled badge (awaiting HR)
 *   REJECTED         → —
 *   CANCELLED        → —
 */

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cancelLeaveRequest, submitLeaveRequest, deleteDraftLeaveRequest } from '@/app/leave-request/actions'

type Props = {
  leaveId: string
  status:  string
}

export default function LeaveActionsCell({ leaveId, status }: Props) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const router = useRouter()

  function handleSubmit() {
    setFeedback(null)
    startTransition(async () => {
      const result = await submitLeaveRequest(leaveId)
      if (result.success) {
        setFeedback({ ok: true, msg: result.message ?? 'ส่งคำขอลาเรียบร้อยแล้ว' })
        router.refresh()
      } else {
        setFeedback({ ok: false, msg: result.error ?? 'เกิดข้อผิดพลาด' })
      }
    })
  }

  function handleDeleteDraft() {
    setFeedback(null)
    startTransition(async () => {
      const result = await deleteDraftLeaveRequest(leaveId)
      if (result.success) {
        router.refresh()
      } else {
        setFeedback({ ok: false, msg: result.error ?? 'เกิดข้อผิดพลาด' })
      }
    })
  }

  function handleCancel() {
    setFeedback(null)
    startTransition(async () => {
      const result = await cancelLeaveRequest(leaveId)
      if (result.success) {
        router.refresh()
      } else {
        setFeedback({ ok: false, msg: result.error ?? 'เกิดข้อผิดพลาด' })
      }
    })
  }

  // Show feedback in-row once an action completes
  if (feedback) {
    return (
      <span className={`text-xs font-medium ${feedback.ok ? 'text-green-600' : 'text-red-500'}`}>
        {feedback.msg}
      </span>
    )
  }

  // ── DRAFT: submit + edit + delete draft ──────────────────────────────────
  if (status === 'DRAFT') {
    return (
      <div className="flex items-center gap-2 justify-center">
        <button
          onClick={handleSubmit}
          disabled={pending}
          className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition disabled:opacity-50"
        >
          {pending ? '…' : 'ส่งคำขอ'}
        </button>
        <Link
          href={`/leave-request/${leaveId}/edit`}
          className="px-3 py-1 text-xs font-semibold bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition"
        >
          แก้ไข
        </Link>
        <button
          onClick={handleDeleteDraft}
          disabled={pending}
          className="px-3 py-1 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
        >
          {pending ? '…' : 'ลบร่าง'}
        </button>
      </div>
    )
  }

  // ── PENDING / IN_REVIEW: cancel ────────────────────────────────────────────
  if (status === 'PENDING' || status === 'IN_REVIEW') {
    return (
      <button
        onClick={handleCancel}
        disabled={pending}
        className="px-3 py-1 text-xs font-semibold bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
      >
        {pending ? '…' : 'ยกเลิก'}
      </button>
    )
  }

  // ── APPROVED: request cancellation (APPROVED → CANCEL_REQUESTED) ───────────
  if (status === 'APPROVED') {
    return (
      <button
        onClick={handleCancel}
        disabled={pending}
        className="px-3 py-1 text-xs font-semibold bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition disabled:opacity-50"
      >
        {pending ? '…' : 'ขอยกเลิก'}
      </button>
    )
  }

  // ── CANCEL_REQUESTED: awaiting HR ──────────────────────────────────────────
  if (status === 'CANCEL_REQUESTED') {
    return (
      <span className="text-xs font-medium text-amber-600">รออนุมัติการยกเลิก</span>
    )
  }

  // REJECTED / CANCELLED / other — no actions
  return <span className="text-gray-400 text-sm">—</span>
}
