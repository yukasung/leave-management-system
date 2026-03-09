'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateLeaveType, deleteLeaveType, type LeaveTypeFormState } from './actions'

type LeaveTypeData = {
  id: string
  name: string
  maxDaysPerYear: number | null
  maxDaysPerRequest: number | null
  requiresAttachment: boolean
  deductFromBalance: boolean
  allowDuringProbation: boolean
  _count: { leaveRequests: number }
}

const initial: LeaveTypeFormState = { success: false, message: '' }

export default function EditLeaveTypeForm({ leaveType }: { leaveType: LeaveTypeData }) {
  const router = useRouter()
  const boundUpdate = updateLeaveType.bind(null, leaveType.id)
  const [state, action, pending] = useActionState(boundUpdate, initial)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteState, setDeleteState] = useState<LeaveTypeFormState | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/admin/settings'), 1200)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  useEffect(() => {
    if (deleteState?.success) {
      const t = setTimeout(() => router.push('/admin/settings'), 1200)
      return () => clearTimeout(t)
    }
  }, [deleteState?.success, router])

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteLeaveType(leaveType.id)
    setDeleteState(result)
    setDeleting(false)
  }

  return (
    <div className="space-y-8">
      <form action={action} className="space-y-5">
        {state.message && (
          <div
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              state.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {state.message}
            {state.success && <span className="ml-2 text-green-500">กำลังกลับไปหน้าตั้งค่า…</span>}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            ชื่อประเภทการลา <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={leaveType.name}
            className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {state.errors?.name && <p className="text-xs text-red-500 mt-1">{state.errors.name}</p>}
        </div>

        {/* Max days */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">วันสูงสุดต่อปี</label>
            <input
              name="maxDaysPerYear"
              type="number"
              min="0"
              step="0.5"
              defaultValue={leaveType.maxDaysPerYear ?? ''}
              placeholder="ไม่จำกัด"
              className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">วันสูงสุดต่อครั้ง</label>
            <input
              name="maxDaysPerRequest"
              type="number"
              min="0"
              step="0.5"
              defaultValue={leaveType.maxDaysPerRequest ?? ''}
              placeholder="ไม่จำกัด"
              className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Toggles */}
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-foreground mb-2">การตั้งค่าเพิ่มเติม</legend>
          <ToggleField
            name="requiresAttachment"
            label="ต้องแนบเอกสารประกอบ"
            defaultValue={leaveType.requiresAttachment}
          />
          <ToggleField
            name="deductFromBalance"
            label="หักจากยอดวันลา"
            defaultValue={leaveType.deductFromBalance}
          />
          <ToggleField
            name="allowDuringProbation"
            label="อนุญาตให้ลาช่วงทดลองงานได้"
            defaultValue={leaveType.allowDuringProbation}
          />
        </fieldset>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending || state.success}
            className="bg-primary hover:bg-primary/90 disabled:opacity-60 text-primary-foreground text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {pending ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
          <a href="/admin/settings/leave-types" className="text-sm text-muted-foreground hover:text-foreground underline">
            ยกเลิก
          </a>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="border border-red-200 rounded-xl p-5 bg-red-950/10 dark:bg-red-950/20">
        <h3 className="text-sm font-semibold text-red-700 mb-1">โซนอันตราย</h3>
        <p className="text-xs text-red-600 mb-4">
          การลบประเภทการลาจะไม่สามารถยกเลิกได้ หากมีคำขอลาอยู่จะไม่สามารถลบได้
        </p>

        {deleteState?.message && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium mb-3 ${
              deleteState.success
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-100 text-red-700 border border-red-300'
            }`}
          >
            {deleteState.message}
          </div>
        )}

        {leaveType._count.leaveRequests > 0 ? (
          <p className="text-xs text-red-500 font-medium">
            ⚠️ ไม่สามารถลบได้ — มีคำขอลา {leaveType._count.leaveRequests} รายการที่ใช้ประเภทนี้
          </p>
        ) : !deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            ลบประเภทการลานี้
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-700 font-medium">ยืนยันการลบ?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || deleteState?.success}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {deleting ? 'กำลังลบ…' : 'ยืนยัน ลบเลย'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ToggleField({
  name,
  label,
  defaultValue,
}: {
  name: string
  label: string
  defaultValue: boolean
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <select
        name={name}
        defaultValue={defaultValue ? 'true' : 'false'}
        className="border border-input bg-background text-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="true">ใช่</option>
        <option value="false">ไม่</option>
      </select>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  )
}
