'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { createLeaveType, type LeaveTypeFormState } from './actions'

const initial: LeaveTypeFormState = { success: false, message: '' }

export default function NewLeaveTypeForm({ categories }: { categories: { id: string; name: string }[] }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(createLeaveType, initial)
  const [limitType, setLimitType] = useState<'PER_YEAR' | 'PER_EVENT' | 'MEDICAL_BASED'>('PER_YEAR')

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/admin/settings/leave-types'), 1200)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  return (
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
          {state.success && <span className="ml-2 text-green-500">กำลังกลับไปหน้าประเภทการลา…</span>}
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
          placeholder="เช่น ลาป่วย, ลากิจ, ลาพักร้อน"
          className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {state.errors?.name && <p className="text-xs text-red-500 mt-1">{state.errors.name}</p>}
      </div>

      {/* Classification */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">หมวดหมู่การลา</label>
          <select
            name="leaveCategoryId"
            className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— ไม่ระบุ —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">ประเภทขีดจำกัด</label>
          <select
            name="leaveLimitType"
            defaultValue="PER_YEAR"
            value={limitType}
            onChange={e => setLimitType(e.target.value as typeof limitType)}
            className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="PER_YEAR">ต่อปี</option>
            <option value="PER_EVENT">ต่อครั้ง</option>
            <option value="MEDICAL_BASED">ตามใบรับรองแพทย์</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">การนับวัน</label>
          <select
            name="dayCountType"
            defaultValue="WORKING_DAY"
            className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="WORKING_DAY">วันทำการ</option>
            <option value="CALENDAR_DAY">วันปฏิทิน</option>
          </select>
        </div>
      </div>

      {/* Max days */}
      {limitType === 'MEDICAL_BASED' ? (
        <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3">
          จำนวนวันลากำหนดตามใบรับรองแพทย์ ไม่มีขีดจำกัดคงที่
        </p>
      ) : (
        <div className="max-w-xs">
          {limitType === 'PER_YEAR' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                วันสูงสุดต่อปี
              </label>
              <input
                name="maxDaysPerYear"
                type="number"
                min="0"
                step="0.5"
                placeholder="ไม่จำกัด"
                className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
          {limitType === 'PER_EVENT' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                วันสูงสุดต่อครั้ง
              </label>
              <input
                name="maxDaysPerRequest"
                type="number"
                min="0"
                step="0.5"
                placeholder="ไม่จำกัด"
                className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}
        </div>
      )}

      {/* Toggles */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground mb-2">การตั้งค่าเพิ่มเติม</legend>

        <ToggleField
          name="requiresAttachment"
          label="ต้องแนบเอกสารประกอบ"
          defaultValue={false}
        />
        <ToggleField
          name="deductFromBalance"
          label="หักจากยอดวันลา"
          defaultValue={true}
        />
        <ToggleField
          name="allowDuringProbation"
          label="อนุญาตให้ลาช่วงทดลองงานได้"
          defaultValue={true}
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
        <button
          type="button"
          onClick={() => router.push('/admin/settings/leave-types')}
          className="border border-input bg-background hover:bg-muted text-foreground text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </form>
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
