'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEmployee, type CreateEmployeeState } from './actions'
import AvatarUploader from '../AvatarUploader'

type Department = { id: string; name: string; manager: { employee: { id: string } | null } | null }
type ManagerOption  = { id: string; firstName: string; lastName: string; position: string }
type PositionOption = { id: string; name: string }

const initialState: CreateEmployeeState = {}

export default function NewEmployeeForm({
  departments,
  managers,
  positions,
}: {
  departments: Department[]
  managers:    ManagerOption[]
  positions:   PositionOption[]
}) {
  const router = useRouter()
  const [firstName,         setFirstName]        = useState('')
  const [lastName,          setLastName]          = useState('')
  const [selectedDeptId,    setSelectedDeptId]    = useState('')
  const [selectedManagerId, setSelectedManagerId] = useState('')
  const [state, formAction, pending] = useActionState(createEmployee, initialState)

  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId)
    const dept = departments.find((d) => d.id === deptId)
    const deptManagerEmployeeId = dept?.manager?.employee?.id
    if (deptManagerEmployeeId) setSelectedManagerId(deptManagerEmployeeId)
  }

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/admin/employees'), 1200)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  const e = state.errors ?? {}

  return (
    <form action={formAction} className="space-y-6">
      {/* Global error */}
      {e.general && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {e.general}
        </div>
      )}

      {/* Success */}
      {state.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {state.message} — กำลังพาคุณกลับ…
        </div>
      )}

      {/* ── Section: Basic Info ── */}
      <fieldset className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
          ข้อมูลพื้นฐาน
        </legend>

        {/* Avatar */}
        <AvatarUploader initials={`${firstName}${lastName}` || 'EMP'} />

        {/* Row: Employee Code */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            รหัสพนักงาน <Required />
          </label>
          <input
            type="text"
            name="employeeCode"
            placeholder="เช่น EMP-001"
            autoComplete="off"
            className={inputCls(!!e.employeeCode)}
          />
          <FieldError msg={e.employeeCode} />
        </div>

        {/* Row: First / Last name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              ชื่อ <Required />
            </label>
            <input
              type="text"
              name="firstName"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="ชื่อ"
              className={inputCls(!!e.firstName)}
            />
            <FieldError msg={e.firstName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              นามสกุล <Required />
            </label>
            <input
              type="text"
              name="lastName"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="นามสกุล"
              className={inputCls(!!e.lastName)}
            />
            <FieldError msg={e.lastName} />
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            อีเมล <Required />
          </label>
          <input
            type="email"
            name="email"
            placeholder="employee@company.com"
            autoComplete="off"
            className={inputCls(!!e.email)}
          />
          <FieldError msg={e.email} />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            เบอร์โทรศัพท์
          </label>
          <input
            type="tel"
            name="phone"
            placeholder="เช่น 081-234-5678"
            className={inputCls(false)}
          />
        </div>
      </fieldset>

      {/* ── Section: Position & Role ── */}
      <fieldset className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
          ตำแหน่งและบทบาท
        </legend>

        {/* Department */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            แผนก
          </label>
          <select
            name="departmentId"
            value={selectedDeptId}
            onChange={(ev) => handleDeptChange(ev.target.value)}
            className={selectCls(!!e.departmentId)}
          >
            <option value="">— ไม่ระบุแผนก —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <FieldError msg={e.departmentId} />
        </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              ตำแหน่งงาน <Required />
            </label>
            <select
              name="positionId"
              className={selectCls(!!e.positionId)}
              defaultValue=""
            >
              <option value="">— เลือกตำแหน่งงาน —</option>
              {positions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <FieldError msg={e.positionId} />
          </div>
          </div>

        {/* Manager */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            ผู้จัดการสายงาน
          </label>
          <select
            name="managerId"
            value={selectedManagerId}
            onChange={(ev) => setSelectedManagerId(ev.target.value)}
            className={selectCls(!!e.managerId)}
          >
            <option value="">— ไม่มีผู้จัดการ —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.firstName} {m.lastName} — {m.position}
              </option>
            ))}
          </select>
          <FieldError msg={e.managerId} />
        </div>

        <div className="pt-1">
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              name="isProbation"
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span>
              <span className="text-sm font-medium text-foreground group-hover:text-foreground">
                อยู่ระหว่างทดลองงาน
              </span>
              <br />
              <span className="text-xs text-muted-foreground/60">
                พนักงานทดลองงานอาจไม่สามารถลาบางประเภทได้ตามนโยบาย เช่น วันลาพักร้อน
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {/* ── Section: System Permissions ── */}
      <fieldset className="bg-card rounded-2xl border border-border shadow-sm p-6">
        <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5 mb-4">
          สิทธิ์ระบบ
        </legend>
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer select-none group">
            <input
              type="checkbox"
              name="isAdmin"
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span>
              <span className="text-sm font-medium text-foreground group-hover:text-foreground">
                ผู้ดูแลระบบ
              </span>
              <br />
              <span className="text-xs text-muted-foreground/60">
                สามารถจัดการพนักงาน ดูคำขอลาทั้งหมด และอนุมัติการลาเมื่อไม่มีผู้จัดการสายงาน
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-1 pb-4">
        <a
          href="/admin/employees"
          className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition"
        >
          ยกเลิก
        </a>
        <button
          type="submit"
          disabled={pending || state.success}
          className="px-6 py-2.5 text-sm font-semibold bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition"
        >
          {pending ? 'กำลังบันทึก…' : 'บันทึกข้อมูล'}
        </button>
      </div>
    </form>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const baseInput =
  'w-full px-3.5 py-2.5 text-sm border rounded-lg focus:outline-none focus:ring-2 transition'

function inputCls(hasError: boolean) {
  return `${baseInput} ${
    hasError
      ? 'border-red-400 focus:ring-red-400 bg-red-50'
      : 'border-input bg-background text-foreground focus:ring-primary'
  }`
}

function selectCls(hasError: boolean) {
  return `${baseInput} bg-background text-foreground ${
    hasError
      ? 'border-red-400 focus:ring-red-400'
      : 'border-input focus:ring-primary'
  }`
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1.5 text-xs text-red-600">{msg}</p>
}

function Required() {
  return <span className="text-red-500 ml-0.5">*</span>
}
