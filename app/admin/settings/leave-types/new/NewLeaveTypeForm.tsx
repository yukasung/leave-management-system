'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createLeaveType, type LeaveTypeFormState } from './actions'

const initial: LeaveTypeFormState = { success: false, message: '' }

export default function NewLeaveTypeForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState(createLeaveType, initial)

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/admin/settings'), 1200)
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
          {state.success && <span className="ml-2 text-green-500">กำลังกลับไปหน้าตั้งค่า…</span>}
        </div>
      )}

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          ชื่อประเภทการลา <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          placeholder="เช่น ลาป่วย, ลากิจ, ลาพักร้อน"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {state.errors?.name && <p className="text-xs text-red-500 mt-1">{state.errors.name}</p>}
      </div>

      {/* Max days */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันสูงสุดต่อปี
          </label>
          <input
            name="maxDaysPerYear"
            type="number"
            min="0"
            step="0.5"
            placeholder="ไม่จำกัด"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            วันสูงสุดต่อครั้ง
          </label>
          <input
            name="maxDaysPerRequest"
            type="number"
            min="0"
            step="0.5"
            placeholder="ไม่จำกัด"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Toggles */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-gray-700 mb-2">การตั้งค่าเพิ่มเติม</legend>

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
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึก'}
        </button>
        <a href="/admin/settings" className="text-sm text-gray-500 hover:text-gray-700 underline">
          ยกเลิก
        </a>
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
        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="true">ใช่</option>
        <option value="false">ไม่</option>
      </select>
      <span className="text-sm text-gray-700">{label}</span>
    </label>
  )
}
