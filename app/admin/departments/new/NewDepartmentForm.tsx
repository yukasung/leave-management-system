'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createDepartment, type DepartmentFormState } from './actions'

const initial: DepartmentFormState = { success: false, message: '' }

export default function NewDepartmentForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState(createDepartment, initial)

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/admin/departments'), 1200)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  return (
    <form action={action} className="space-y-5">
      {/* Feedback */}
      {state.message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            state.success
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {state.message}
          {state.success && <span className="ml-2 text-green-500">กำลังกลับไปหน้าแผนก…</span>}
        </div>
      )}

      {/* Department Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          ชื่อแผนก <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          placeholder="เช่น ฝ่ายบุคคล, ฝ่ายไอที"
          className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {state.errors?.name && (
          <p className="text-xs text-red-500 mt-1">{state.errors.name}</p>
        )}
      </div>

      {/* Actions */}
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
          onClick={() => router.push('/admin/departments')}
          className="border border-input bg-background hover:bg-muted text-foreground text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
