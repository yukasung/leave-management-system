'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createEmployee, type CreateEmployeeState } from './actions'
import AvatarUploader from '../AvatarUploader'
import { User, Mail, Phone, Hash } from 'lucide-react'

type Department = { id: string; name: string }
type ManagerOption  = { id: string; firstName: string; lastName: string; positionRef: { name: string } | null; department: { name: string } | null }
type PositionOption = { id: string; name: string; departmentId?: string | null }

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
  const [state, formAction, pending] = useActionState(createEmployee, initialState)

  function handleDeptChange(deptId: string) {
    setSelectedDeptId(deptId)
  }

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(() => router.push('/admin/employees'), 1200)
      return () => clearTimeout(t)
    }
  }, [state.success, router])

  const e = state.errors ?? {}

  const filteredPositions = selectedDeptId
    ? positions.filter((p) => p.departmentId === selectedDeptId || !p.departmentId)
    : positions

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
          <div className="relative">
            <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
            <input
              type="text"
              name="employeeCode"
              placeholder="เช่น EMP-001"
              autoComplete="off"
              required
              className={`${inputCls(!!e.employeeCode)} pl-9`}
            />
          </div>
          <FieldError msg={e.employeeCode} />
        </div>

        {/* Row: First / Last name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              ชื่อ <Required />
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              <input
                type="text"
                name="firstName"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="ชื่อ"
                required
                className={`${inputCls(!!e.firstName)} pl-9`}
              />
            </div>
            <FieldError msg={e.firstName} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              นามสกุล <Required />
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              <input
                type="text"
                name="lastName"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="นามสกุล"
                required
                className={`${inputCls(!!e.lastName)} pl-9`}
              />
            </div>
            <FieldError msg={e.lastName} />
          </div>
        </div>

        {/* Row: Email + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              อีเมล <Required />
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              <input
                type="email"
                name="email"
                placeholder="employee@company.com"
                autoComplete="off"
                required
                className={`${inputCls(!!e.email)} pl-9`}
              />
            </div>
            <FieldError msg={e.email} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              เบอร์โทรศัพท์
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              <input
                type="tel"
                name="phone"
                placeholder="เช่น 081-234-5678"
                className={`${inputCls(false)} pl-9`}
              />
            </div>
          </div>
        </div>
      </fieldset>

      {/* ── Section: Position & Role ── */}
      <fieldset className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
        <legend className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-0.5">
          ตำแหน่งและบทบาท
        </legend>

        {/* Department + Position row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Department */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              แผนก <Required />
            </label>
            <select
              name="departmentId"
              value={selectedDeptId}
              onChange={(ev) => handleDeptChange(ev.target.value)}
              className={selectCls(!!e.departmentId)}
              required
            >
              <option value="" disabled>— เลือกแผนก —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <FieldError msg={e.departmentId} />
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              ตำแหน่งงาน <Required />
            </label>
            <select
              name="positionId"
              className={selectCls(!!e.positionId)}
              defaultValue=""
              required
            >
              <option value="" disabled>— เลือกตำแหน่งงาน —</option>
              {filteredPositions.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <FieldError msg={e.positionId} />
          </div>
        </div>

        {/* Manager */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            ผู้อนุมัติการลา
          </label>
          <div className="rounded-lg border border-input overflow-hidden overflow-x-auto">
              <table className="w-full min-w-120 text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="w-10 px-3 py-2"></th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">ชื่อ-นามสกุล</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">ตำแหน่งงาน</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground whitespace-nowrap">แผนก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {managers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-3 py-4 text-center text-sm text-muted-foreground italic">
                        ไม่มีข้อมูลผู้อนุมัติการลา
                      </td>
                    </tr>
                  ) : (
                    managers.map((m) => (
                      <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                        <td className="px-3 py-2.5 text-center">
                          <input
                            type="checkbox"
                            name="approverIds"
                            value={m.id}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                          />
                        </td>
                        <td className="px-3 py-2.5 font-medium text-foreground whitespace-nowrap">{m.firstName} {m.lastName}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{m.positionRef?.name || <span className="italic opacity-50">ไม่ระบุ</span>}</td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground whitespace-nowrap">{m.department?.name ?? <span className="italic opacity-50">ไม่ระบุ</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
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
          {([
            { value: 'none',    label: 'พนักงานทั่วไป',    hint: 'ไม่มีสิทธิ์พิเศษเพิ่มเติม' },
            { value: 'manager', label: 'ผู้อนุมัติการลา', hint: 'สามารถอนุมัติหรือปฏิเสธคำขอลาของพนักงานในสายงาน' },
            { value: 'admin',   label: 'ผู้ดูแลระบบ',     hint: 'สามารถจัดการพนักงาน ดูคำขอลาทั้งหมด และอนุมัติการลาเมื่อไม่มีผู้อนุมัติการลา' },
          ] as const).map(({ value, label, hint }) => (
            <label key={value} className="flex items-start gap-3 cursor-pointer select-none group">
              <input
                type="radio"
                name="role"
                value={value}
                defaultChecked={value === 'none'}
                className="mt-0.5 h-4 w-4 border-input text-primary focus:ring-primary"
              />
              <span>
                <span className="text-sm font-medium text-foreground group-hover:text-foreground">
                  {label}
                </span>
                <br />
                <span className="text-xs text-muted-foreground/60">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-1 pb-4">
        <button
          type="button"
          onClick={() => router.push('/admin/employees')}
          className="px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/40 transition"
        >
          ยกเลิก
        </button>
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
