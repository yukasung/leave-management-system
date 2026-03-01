'use client'

import { useActionState } from 'react'
import { createLeaveRequest, type FormState } from './actions'

type LeaveType = {
  id: string
  name: string
  daysPerYear: number
}

const initialState: FormState = {}

export default function LeaveRequestForm({ leaveTypes }: { leaveTypes: LeaveType[] }) {
  const [state, formAction, pending] = useActionState(createLeaveRequest, initialState)

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white rounded-2xl shadow-md p-8">
      <h1 className="text-2xl font-bold text-gray-800 mb-1">แบบฟอร์มขอลา</h1>
      <p className="text-sm text-gray-500 mb-6">กรอกข้อมูลการลาและส่งคำขอ</p>

      {state.success && (
        <div className="mb-5 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          ✅ {state.message}
        </div>
      )}

      {state.errors?.general && (
        <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
          {state.errors.general}
        </div>
      )}

      <form action={formAction} className="space-y-5">
        {/* Leave Type */}
        <div>
          <label htmlFor="leaveTypeId" className="block text-sm font-medium text-gray-700 mb-1">
            ประเภทการลา <span className="text-red-500">*</span>
          </label>
          <select
            id="leaveTypeId"
            name="leaveTypeId"
            defaultValue=""
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="" disabled>-- เลือกประเภทการลา --</option>
            {leaveTypes.map((lt) => (
              <option key={lt.id} value={lt.id}>
                {lt.name} (สิทธิ์ {lt.daysPerYear} วัน/ปี)
              </option>
            ))}
          </select>
          {state.errors?.leaveTypeId && (
            <p className="mt-1 text-xs text-red-500">{state.errors.leaveTypeId}</p>
          )}
        </div>

        {/* Start Date */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            วันที่เริ่มต้น <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            min={today}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state.errors?.startDate && (
            <p className="mt-1 text-xs text-red-500">{state.errors.startDate}</p>
          )}
        </div>

        {/* End Date */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            วันที่สิ้นสุด <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="endDate"
            name="endDate"
            min={today}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {state.errors?.endDate && (
            <p className="mt-1 text-xs text-red-500">{state.errors.endDate}</p>
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
            rows={4}
            placeholder="ระบุเหตุผลในการลา (ถ้ามี)"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          {state.errors?.reason && (
            <p className="mt-1 text-xs text-red-500">{state.errors.reason}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-60"
        >
          {pending ? 'กำลังส่งคำขอ...' : 'ส่งคำขอลา'}
        </button>
      </form>
    </div>
  )
}
