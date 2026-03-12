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
import { Eye } from 'lucide-react'
import { cancelLeaveRequest } from '@/app/leave-request/actions'

type Props = {
  leaveId: string
  status:  string
}

export default function LeaveActionsCell({ leaveId, status }: Props) {
  const [pending, startTransition] = useTransition()
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null)
  const router = useRouter()

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
      <div className="inline-flex items-center gap-2">
        <ViewLink leaveId={leaveId} />
        <span className={`text-xs font-medium ${feedback.ok ? 'text-green-600' : 'text-red-500'}`}>
          {feedback.msg}
        </span>
      </div>
    )
  }

  // ── PENDING / IN_REVIEW: request cancellation (goes through HR approval) ──
  if (status === 'PENDING' || status === 'IN_REVIEW') {
    return (
      <div className="inline-flex items-center gap-2">
        <ViewLink leaveId={leaveId} />
        <button
          onClick={handleCancel}
          disabled={pending}
          className="px-3 py-1 text-xs font-semibold bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition disabled:opacity-50"
        >
          {pending ? '…' : 'ขอยกเลิก'}
        </button>
      </div>
    )
  }

  // ── APPROVED: only HR/admin can cancel, employee cannot ────────────────────
  // (no button rendered)

  // ── CANCEL_REQUESTED: awaiting HR ──────────────────────────────────────────
  if (status === 'CANCEL_REQUESTED') {
    return (
      <div className="inline-flex items-center gap-2">
        <ViewLink leaveId={leaveId} />
        <span className="text-xs font-medium text-amber-600 whitespace-nowrap">รออนุมัติการยกเลิก</span>
      </div>
    )
  }

  // REJECTED / CANCELLED / APPROVED / other — just view
  return <ViewLink leaveId={leaveId} />
}

function ViewLink({ leaveId }: { leaveId: string }) {
  return (
    <Link
      href={`/leave-request/${leaveId}/edit`}
      title="ดูรายละเอียด"
      className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
    >
      <Eye className="h-4 w-4" />
    </Link>
  )
}
