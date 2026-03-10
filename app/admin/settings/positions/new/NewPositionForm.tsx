'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createPosition, type PositionFormState } from './actions'

const initial: PositionFormState = { success: false, message: '' }

export default function NewPositionForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState(createPosition, initial)

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/admin/settings'), 1200)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  return (
    <form action={action} className="space-y-5">
      {state.message && (
        <div className={`rounded-lg px-4 py-3 text-sm font-medium ${state.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {state.message}
          {state.success && <span className="ml-2 text-green-500">กำลังกลับไปหน้าตั้งค่า…</span>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          ชื่อตำแหน่ง <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          type="text"
          required
          placeholder="เช่น Software Engineer, Associate, HR Officer"
          className="w-full border border-input bg-background text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        {state.errors?.name && <p className="text-xs text-red-500 mt-1">{state.errors.name}</p>}
      </div>

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
          onClick={() => router.push('/admin/settings/positions')}
          className="border border-input bg-background hover:bg-muted text-foreground text-sm font-medium px-5 py-2 rounded-lg transition-colors"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  )
}
