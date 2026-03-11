'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { updateEmployee, deactivateEmployee, reactivateEmployee, type UpdateEmployeeState } from './actions'
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
  isManager:    boolean
  isProbation:  boolean
  isActive:     boolean
  departmentId: string | null
  managerId:    string | null
  approverIds:  string[]
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

  const boundAction = updateEmployee.bind(null, employee.id)
  const [state, formAction, pending] = useActionState(boundAction, initialState)

  const [selectedDeptId,    setSelectedDeptId]    = useState(employee.departmentId ?? '')
  const [selectedManagerId, setSelectedManagerId] = useState(employee.managerId ?? '')
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [deactivating, setDeactivating] = useState(false)
  const [reactivating, setReactivating] = useState(false)
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
    if (result.success) setTimeout(() => router.push('/admin/employees'), 1500)
  }

  async function handleReactivate() {
    setReactivating(true)
    const result = await reactivateEmployee(employee.id)
    setReactivating(false)
    setDeactivateMsg({ ok: result.success ?? false, text: result.message ?? '' })
    if (result.success) setTimeout(() => router.push('/admin/employees'), 1500)
  }

  const e = state.errors ?? {}

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {deactivateMsg && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          deactivateMsg.ok
            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/30 dark:border-green-800/50 dark:text-green-400'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-400'
        }`}>
          {deactivateMsg.text}
        </div>
      )}

      <form action={formAction}>

        {/* Alerts */}
        {e.general && (
          <div className="mb-5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:border-red-800/50 dark:text-red-400">
            {e.general}
          </div>
        )}
        {state.success && (
          <div className="mb-5 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:border-green-800/50 dark:text-green-400">
            {state.message} — กำลังพาคุณกลับ…
          </div>
        )}

        {/* Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* ── LEFT: Profile card ──────────────────────────────────────── */}
          <div className="lg:col-span-1 bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            {/* Avatar area */}
            <div className="bg-linear-to-b from-primary/8 to-transparent px-6 pt-8 pb-6 flex flex-col items-center gap-3">
              <AvatarUploader
                compact
                name="avatarUrl"
                defaultUrl={employee.avatarUrl}
                initials={`${employee.firstName}${employee.lastName}`}
              />
              <div className="text-center">
                <p className="font-semibold text-foreground text-base leading-tight">
                  {employee.firstName} {employee.lastName}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {employee.employeeCode}
                </p>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                employee.isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                  : 'bg-red-50 text-red-500 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${employee.isActive ? 'bg-emerald-500' : 'bg-red-400'}`} />
                {employee.isActive ? 'ทำงานอยู่' : 'ไม่ทำงาน'}
              </span>
            </div>

            {/* Contact details */}
            <div className="px-6 pb-6 space-y-4 border-t border-border pt-5">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">อีเมล</p>
                <p className="text-sm text-foreground truncate">{employee.email}</p>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1.5" htmlFor="emp-phone">
                  เบอร์โทรศัพท์
                </label>
                <input
                  id="emp-phone"
                  type="tel"
                  name="phone"
                  defaultValue={employee.phone ?? ''}
                  placeholder="081-234-5678"
                  className={inputCls(false)}
                />
              </div>
            </div>
          </div>

          {/* ── RIGHT: Form sections ────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Position & Organisation */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 pb-1 border-b border-border">
                <span className="w-1 h-4 rounded-full bg-primary inline-block" />
                <h3 className="text-sm font-semibold text-foreground">ตำแหน่งและองค์กร</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">แผนก</label>
                  <select
                    name="departmentId"
                    value={selectedDeptId}
                    onChange={(ev) => handleDeptChange(ev.target.value)}
                    className={selectCls(!!e.departmentId)}
                  >
                    <option value="">— ไม่ระบุแผนก —</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <FieldError msg={e.departmentId} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
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
                <label className="block text-sm font-medium text-foreground mb-1.5">ผู้อนุมัติการลา</label>
                {managers.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">ยังไม่มีผู้อนุมัติการลาในระบบ</p>
                ) : (
                  <div className="rounded-lg border border-input overflow-hidden">
                    <table className="min-w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="w-10 px-3 py-2"></th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">ชื่อ-นามสกุล</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">แผนก / ตำแหน่ง</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {managers
                          .filter((m) => m.id !== employee.id)
                          .map((m) => (
                            <tr key={m.id} className="hover:bg-muted/40 transition-colors">
                              <td className="px-3 py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  name="approverIds"
                                  value={m.id}
                                  defaultChecked={employee.approverIds.includes(m.id)}
                                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                                />
                              </td>
                              <td className="px-3 py-2.5 font-medium text-foreground">{m.firstName} {m.lastName}</td>
                              <td className="px-3 py-2.5 text-muted-foreground">{m.position}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <FieldError msg={e.managerId} />
              </div>

              <div className="pt-1">
                <CheckboxField
                  name="isProbation"
                  defaultChecked={employee.isProbation}
                  label="อยู่ระหว่างทดลองงาน"
                  hint="พนักงานทดลองงานอาจไม่สามารถลาบางประเภทได้ตามนโยบาย เช่น วันลาพักร้อน"
                />
              </div>
            </div>

            {/* System Permissions */}
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-2 pb-1 border-b border-border">
                <span className="w-1 h-4 rounded-full bg-primary inline-block" />
                <h3 className="text-sm font-semibold text-foreground">สิทธิ์ระบบ</h3>
              </div>
              <CheckboxField
                name="isManager"
                defaultChecked={employee.isManager}
                label="ผู้อนุมัติการลา"
                hint="สามารถอนุมัติหรือปฏิเสธคำขอลาของพนักงานในสายงาน"
              />
              <CheckboxField
                name="isAdmin"
                defaultChecked={employee.isAdmin}
                label="ผู้ดูแลระบบ"
                hint="สามารถจัดการพนักงาน ดูคำขอลาทั้งหมด และอนุมัติการลาเมื่อไม่มีผู้อนุมัติการลา"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => router.push('/admin/employees')}
                className="px-5 py-2.5 text-sm font-medium text-muted-foreground border border-border rounded-lg hover:bg-muted/40 transition"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={pending || state.success}
                className="px-6 py-2.5 text-sm font-semibold bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-primary-foreground rounded-lg transition"
              >
                {pending ? 'กำลังบันทึก…' : 'บันทึกการเปลี่ยนแปลง'}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* ── Danger zone ─────────────────────────────────────────────────── */}
      <div className="bg-card rounded-2xl border border-red-200 dark:border-red-900/50 shadow-sm p-6">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">โซนอันตราย</p>
            {employee.isActive ? (
              <p className="text-sm text-muted-foreground mt-1">
                การระงับบัญชีจะซ่อนพนักงานออกจากระบบ แต่ไม่ลบข้อมูล สามารถเปิดใช้งานใหม่ได้ในภายหลัง
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-1">
                บัญชีนี้ถูกระงับการใช้งานอยู่ กดปุ่มด้านล่างเพื่อเปิดใช้งานใหม่
              </p>
            )}
          </div>
        </div>

        <div className="mt-4">
          {employee.isActive ? (
            !confirmDeactivate ? (
              <button
                onClick={() => setConfirmDeactivate(true)}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition"
              >
                ระงับการใช้งาน
              </button>
            ) : (
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-sm text-red-700 dark:text-red-400 font-medium">
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
                  className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted/40 transition"
                >
                  ยกเลิก
                </button>
              </div>
            )
          ) : (
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="px-4 py-2 text-sm font-medium text-green-700 border border-green-300 rounded-lg hover:bg-green-50 dark:hover:bg-green-950/30 disabled:opacity-60 transition"
            >
              {reactivating ? 'กำลังดำเนินการ…' : 'เปิดใช้งานอีกครั้ง'}
            </button>
          )}
        </div>
      </div>
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
        className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
      />
      <span>
        <span className="text-sm font-medium text-foreground">
          {label}
        </span>
        <br />
        <span className="text-xs text-muted-foreground/60">{hint}</span>
      </span>
    </label>
  )
}


