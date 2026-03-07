'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateEmployee, deactivateEmployee, type UpdateEmployeeState } from './actions'
import AvatarUploader from '../AvatarUploader'

type Department   = { id: string; name: string; manager: { employee: { id: string } | null } | null }
type ManagerOption  = { id: string; firstName: string; lastName: string; position: string }
type PositionOption = { id: string; name: string }

export type EmployeeData = {
  id:           string
  employeeCode: string
  firstName:    string
  lastName:     string
  email:        string
  phone:        string | null
  avatarUrl:    string | null
  position:     string
  positionId:   string | null
  isAdmin:      boolean
  isProbation:  boolean
  isActive:     boolean
  departmentId: string | null
  managerId:    string | null
}

const initialState: UpdateEmployeeState = {}

export default function EditEmployeeForm({
  employee,
  departments,
  managers,
  positions,
}: {
  employee:    EmployeeData
  departments: Department[]
  managers:    ManagerOption[]
  positions:   PositionOption[]
}) {
  const router = useRouter()

  // Bind the employee id into the action
  const boundAction = updateEmployee.bind(null, employee.id)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  // Deactivate confirmation state
  const [selectedDeptId,    setSelectedDeptId]    = useState(employee.departmentId ?? '')
  const [selectedManagerId, setSelectedManagerId] = useState(employee.managerId ?? '')
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [deactivateMsg, setDeactivateMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId)
    const dept = departments.find((d) => d.id === deptId)
    const deptManagerEmployeeId = dept?.manager?.employee?.id
    if (deptManagerEmployeeId) setSelectedManagerId(deptManagerEmployeeId)
  }

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/admin/employees'), 1500)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  async function handleDeactivate() {
    setDeactivating(true)
    const result = await deactivateEmployee(employee.id)
    setDeactivating(false)
    setConfirmDeactivate(false)
    setDeactivateMsg({ ok: result.success ?? false, text: result.message ?? '' })
    if (result.success) {
      setTimeout(() => router.push('/admin/employees'), 1500)
    }
  }

  const e = state.errors ?? {}

  return (
    <div className="space-y-6">
      {/* Deactivate banner */}
      {deactivateMsg && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            deactivateMsg.ok
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          {deactivateMsg.text}
        </div>
      )}

      {/* Edit form wraps header + all fields */}
      <form action={formAction} className="space-y-6">

        {/* Employee identity header — avatar editable at top */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 pt-5 pb-6">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">ข้อมูลพนักงาน</p>
            <div className="flex items-center gap-6">
              {/* Avatar — compact circle only */}
              <div className="shrink-0 flex flex-col items-center gap-2">
                <AvatarUploader
                  compact
                  name="avatarUrl"
                  defaultUrl={employee.avatarUrl}
                  initials={`${employee.firstName}${employee.lastName}`}
                />
                <span className="text-[10px] text-gray-400">คลิกเพื่อเปลี่ยนรูป</span>
              </div>

              {/* Info grid */}
              <div className="flex-1 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">รหัสพนักงาน</p>
                  <p className="font-mono font-semibold text-gray-700">{employee.employeeCode}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">ชื่อ-นามสกุล</p>
                  <p className="font-semibold text-gray-800">{employee.firstName} {employee.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">อีเมล</p>
                  <p className="text-gray-600 truncate">{employee.email}</p>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-0.5" htmlFor="emp-phone">เบอร์โทรศัพท์</label>
                  <input
                    id="emp-phone"
                    type="tel"
                    name="phone"
                    defaultValue={employee.phone ?? ''}
                    placeholder="081-234-5678"
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {e.general && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {e.general}
          </div>
        )}
        {state.success && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {state.message} — กำลังพาคุณกลับ…
          </div>
        )}

        {/* Position & Role */}
        <fieldset className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <legend className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-0.5">
            ตำแหน่งและบทบาท
          </legend>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">แผนก</label>
            <select
              name="departmentId"
              value={selectedDeptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              className={selectCls(!!e.departmentId)}
            >
              <option value="">— ไม่ระบุแผนก —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <FieldError msg={e.departmentId} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ตำแหน่งงาน <Required />
              </label>
              <select
                name="positionId"
                defaultValue={employee.positionId ?? ''}
                className={selectCls(!!e.positionId)}
              >
                <option value="">— เลือกตำแหน่งงาน —</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <FieldError msg={e.positionId} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              ผู้จัดการสายงาน
            </label>
            <select
              name="managerId"
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              className={selectCls(!!e.managerId)}
            >
              <option value="">— ไม่มีผู้จัดการ —</option>
              {managers
                .filter((m) => m.id !== employee.id)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.firstName} {m.lastName} — {m.position}
                  </option>
                ))}
            </select>
            <FieldError msg={e.managerId} />
          </div>
        </fieldset>

        {/* Status */}
        <fieldset className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <legend className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-0.5">
            สถานะและสิทธิ์
          </legend>

          <CheckboxField
            name="isAdmin"
            defaultChecked={employee.isAdmin}
            label="ผู้ดูแลระบบ (System Admin)"
            hint="สามารถจัดการพนักงาน ดูคำขอลาทั้งหมด และอนุมัติการลาเมื่อไม่มีผู้จัดการสายงาน"
          />

          <CheckboxField
            name="isProbation"
            defaultChecked={employee.isProbation}
            label="อยู่ระหว่างทดลองงาน"
            hint="พนักงานทดลองงานอาจไม่สามารถลาบางประเภทได้ตามนโยบาย"
          />

          <CheckboxField
            name="isActive"
            defaultChecked={employee.isActive}
            label="ใช้งานอยู่ (Active)"
            hint="ยกเลิกเพื่อระงับการเข้าใช้งานระบบโดยไม่ลบข้อมูล"
          />
        </fieldset>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 pt-1 pb-2">
          <a
            href="/admin/employees"
            className="px-5 py-2.5 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            ยกเลิก
          </a>
          <button
            type="submit"
            disabled={pending || state.success}
            className="px-6 py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg transition"
          >
            {pending ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}
          </button>
        </div>
      </form>

      {/* Danger zone — soft delete */}
      {employee.isActive && (
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <p className="text-sm font-semibold text-red-600 mb-1">Danger Zone</p>
          <p className="text-sm text-gray-500 mb-4">
            การระงับบัญชีจะซ่อนพนักงานออกจากระบบ แต่ไม่ลบข้อมูล สามารถเปิดใช้งานใหม่ได้ในภายหลัง
          </p>
          {!confirmDeactivate ? (
            <button
              onClick={() => setConfirmDeactivate(true)}
              className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition"
            >
              ระงับการใช้งาน
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm text-red-700 font-medium">
                ยืนยันการระงับ {employee.firstName} {employee.lastName}?
              </p>
              <button
                onClick={handleDeactivate}
                disabled={deactivating}
                className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg transition"
              >
                {deactivating ? 'กำลังดำเนินการ…' : 'ยืนยัน ระงับบัญชี'}
              </button>
              <button
                onClick={() => setConfirmDeactivate(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                ยกเลิก
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const baseInput =
  'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition'

function inputCls(hasError: boolean) {
  return `${baseInput} ${
    hasError
      ? 'border-red-400 focus:ring-red-400 bg-red-50'
      : 'border-gray-300 focus:ring-blue-500'
  }`
}

function selectCls(hasError: boolean) {
  return `${baseInput} bg-white ${
    hasError
      ? 'border-red-400 focus:ring-red-400 bg-red-50'
      : 'border-gray-300 focus:ring-blue-500'
  }`
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1.5 text-xs text-red-600">{msg}</p>
}

function Required() {
  return <span className="text-red-500 ml-0.5">*</span>
}

function CheckboxField({
  name,
  defaultChecked,
  label,
  hint,
}: {
  name: string
  defaultChecked: boolean
  label: string
  hint: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer select-none group">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
      />
      <span>
        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
          {label}
        </span>
        <br />
        <span className="text-xs text-gray-400">{hint}</span>
      </span>
    </label>
  )
}
