'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateDepartment, deleteDepartment, type DepartmentFormState } from './actions'

type Manager = { id: string; name: string; role: string }

type DepartmentData = {
  id: string
  name: string
  managerId: string | null
  _count: { employees: number }
}

const initial: DepartmentFormState = { success: false, message: '' }

export default function EditDepartmentForm({
  department,
  managers,
}: {
  department: DepartmentData
  managers: Manager[]
}) {
  const router = useRouter()
  const boundUpdate = updateDepartment.bind(null, department.id)
  const [state, action, pending] = useActionState(boundUpdate, initial)

  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteState, setDeleteState] = useState<DepartmentFormState | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/admin/departments'), 1200)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  useEffect(() => {
    if (deleteState?.success) {
      const t = setTimeout(() => router.push('/admin/departments'), 1200)
      return () => clearTimeout(t)
    }
  }, [deleteState?.success, router])

  async function handleDelete() {
    setDeleting(true)
    const result = await deleteDepartment(department.id)
    setDeleteState(result)
    setDeleting(false)
  }

  return (
    <div className="space-y-8">
      {/* Edit Form */}
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
            {state.success && <span className="ml-2 text-green-500">กำลังกลับไปหน้าแผนก…</span>}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ชื่อแผนก <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            type="text"
            required
            defaultValue={department.name}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {state.errors?.name && (
            <p className="text-xs text-red-500 mt-1">{state.errors.name}</p>
          )}
        </div>

        {/* Manager */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">ผู้จัดการแผนก</label>
          <select
            name="managerId"
            defaultValue={department.managerId ?? ''}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— ไม่ระบุ —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={pending || state.success}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {pending ? 'กำลังบันทึก…' : 'บันทึก'}
          </button>
          <a href="/admin/departments" className="text-sm text-gray-500 hover:text-gray-700 underline">
            ยกเลิก
          </a>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="border border-red-200 rounded-xl p-5 bg-red-50">
        <h3 className="text-sm font-semibold text-red-700 mb-1">Danger Zone</h3>
        <p className="text-xs text-red-600 mb-4">
          การลบแผนกจะไม่สามารถยกเลิกได้ หากแผนกมีพนักงานอยู่จะไม่สามารถลบได้
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

        {department._count.employees > 0 ? (
          <p className="text-xs text-red-500 font-medium">
            ⚠️ ไม่สามารถลบได้ — มีพนักงาน {department._count.employees} คนในแผนกนี้
          </p>
        ) : !deleteConfirm ? (
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            ลบแผนกนี้
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-700 font-medium">ยืนยันการลบ?</span>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || deleteState?.success}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {deleting ? 'กำลังลบ…' : 'ยืนยัน ลบเลย'}
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirm(false)}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              ยกเลิก
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
