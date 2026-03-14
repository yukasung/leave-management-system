'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Search, X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import HolidayDatePicker from '@/app/components/HolidayDatePicker'

type Department = { id: string; name: string }
type LeaveType  = { id: string; name: string; leaveCategory: { key: string } | null }
type Category   = { key: string; name: string }

const STATUS_OPTIONS = [
  { value: 'PENDING',          label: 'รออนุมัติ' },
  { value: 'IN_REVIEW',        label: 'รอ HR' },
  { value: 'APPROVED',         label: 'อนุมัติแล้ว' },
  { value: 'REJECTED',         label: 'ปฏิเสธ' },
  { value: 'CANCELLED',        label: 'ยกเลิกแล้ว' },
  { value: 'CANCEL_REQUESTED', label: 'ขอยกเลิก' },
]

interface Props {
  departments: Department[]
  leaveTypes:  LeaveType[]
  categories:  Category[]
  current: {
    employee?:     string
    dateFrom?:     string
    dateTo?:       string
    leaveTypeId?:  string
    leaveCategory?: string
    status?:       string
    departmentId?: string
    sort?:         string
    dir?:          string
  }
  total: number
}

export default function LeaveHistoryFilters({ departments, leaveTypes, categories, current, total }: Props) {
  const router   = useRouter()
  const params   = useParams()
  const locale   = (params?.locale as string) || ''
  const base     = locale ? `/${locale}/hr/leave-history` : '/hr/leave-history'

  const [employee,    setEmployee]    = useState(current.employee     ?? '')
  const [dateFrom,    setDateFrom]    = useState(current.dateFrom     ?? '')
  const [dateTo,      setDateTo]      = useState(current.dateTo       ?? '')
  const [leaveTypeId, setLeaveTypeId] = useState(current.leaveTypeId  ?? '')
  const [leaveCategory, setLeaveCategory] = useState(current.leaveCategory ?? '')
  const [status,      setStatus]      = useState(current.status       ?? '')
  const [departmentId,setDepartmentId]= useState(current.departmentId ?? '')
  const [exporting,   setExporting]   = useState(false)

  const buildQS = useCallback(
    (overrides: Record<string, string> = {}) => {
      const q = new URLSearchParams()
      const vals: Record<string, string> = {
        employee, dateFrom, dateTo, leaveTypeId, leaveCategory, status, departmentId,
        sort: current.sort ?? '', dir: current.dir ?? '',
        ...overrides,
      }
      for (const [k, v] of Object.entries(vals)) if (v) q.set(k, v)
      return q.toString()
    },
    [employee, dateFrom, dateTo, leaveTypeId, leaveCategory, status, departmentId, current.sort, current.dir],
  )

  const applyFilters = useCallback(() => {
    const qs = buildQS({ page: '' })
    router.push(`${base}?${qs}`)
  }, [buildQS, base, router])

  const clearFilters = useCallback(() => {
    setEmployee(''); setDateFrom(''); setDateTo('')
    setLeaveTypeId(''); setLeaveCategory(''); setStatus(''); setDepartmentId('')
    router.push(base)
  }, [base, router])

  const handleExport = async () => {
    setExporting(true)
    const qs = buildQS()
    try {
      const res  = await fetch(`/api/hr/leave-history/export?${qs}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'employee-leave-history.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const hasFilters = !!(employee || dateFrom || dateTo || leaveTypeId || leaveCategory || status || departmentId)

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      {/* Row 1: search + status */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Employee search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="ค้นหาชื่อพนักงาน…"
            value={employee}
            onChange={(e) => setEmployee(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            className="w-full pl-8 h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Department */}
        <select
          value={departmentId}
          onChange={(e) => setDepartmentId(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">ทุกแผนก</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Leave type */}
        <select
          value={leaveCategory}
          onChange={(e) => {
            setLeaveCategory(e.target.value)
            setLeaveTypeId('')
          }}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">ทุกหมวดหมู่</option>
          {categories.map((c) => (
            <option key={c.key} value={c.key}>{c.name}</option>
          ))}
        </select>

        {/* Leave type */}
        <select
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">ทุกประเภทการลา</option>
          {leaveTypes
            .filter((lt) => !leaveCategory || lt.leaveCategory?.key === leaveCategory)
            .map((lt) => (
              <option key={lt.id} value={lt.id}>{lt.name}</option>
            ))}
        </select>

        {/* Status */}
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">ทุกสถานะ</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Row 2: date range */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">วันที่เริ่มต้น</label>
          <HolidayDatePicker name="dateFrom" value={dateFrom} onChange={setDateFrom} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">วันที่สิ้นสุด</label>
          <HolidayDatePicker name="dateTo" value={dateTo} onChange={setDateTo} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={applyFilters}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            ค้นหา
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </button>
          )}
          <span className="text-xs text-muted-foreground pl-1">
            {total.toLocaleString()} รายการ
          </span>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium',
            'bg-emerald-600 text-white hover:bg-emerald-700 transition-colors',
            exporting && 'opacity-60 cursor-not-allowed',
          )}
        >
          <Download className="h-4 w-4" />
          {exporting ? 'กำลังส่งออก…' : 'ส่งออก Excel'}
        </button>
      </div>
    </div>
  )
}
