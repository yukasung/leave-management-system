'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Search, X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

type Department = { id: string; name: string }
type LeaveType  = { id: string; name: string }

interface Props {
  departments:  Department[]
  leaveTypes:   LeaveType[]
  yearOptions:  number[]
  current: {
    employee?:     string
    departmentId?: string
    leaveTypeId?:  string
    year?:         number
  }
  total: number
}

export default function LeaveBalanceReportFilters({
  departments, leaveTypes, yearOptions, current, total,
}: Props) {
  const router  = useRouter()
  const params  = useParams()
  const locale  = (params?.locale as string) || ''
  const base    = locale ? `/${locale}/hr/leave-balance-report` : '/hr/leave-balance-report'

  const [employee,     setEmployee]     = useState(current.employee     ?? '')
  const [departmentId, setDepartmentId] = useState(current.departmentId ?? '')
  const [leaveTypeId,  setLeaveTypeId]  = useState(current.leaveTypeId  ?? '')
  const [year,         setYear]         = useState(String(current.year ?? new Date().getFullYear()))
  const [exporting,    setExporting]    = useState(false)

  const buildQS = useCallback(
    (overrides: Record<string, string> = {}) => {
      const q = new URLSearchParams()
      const vals: Record<string, string> = { employee, departmentId, leaveTypeId, year, ...overrides }
      for (const [k, v] of Object.entries(vals)) if (v) q.set(k, v)
      return q.toString()
    },
    [employee, departmentId, leaveTypeId, year],
  )

  const applyFilters = useCallback(() => {
    router.push(`${base}?${buildQS()}`)
  }, [base, buildQS, router])

  const clearFilters = useCallback(() => {
    const currentYear = String(new Date().getFullYear())
    setEmployee(''); setDepartmentId(''); setLeaveTypeId(''); setYear(currentYear)
    router.push(`${base}?year=${currentYear}`)
  }, [base, router])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res  = await fetch(`/api/hr/leave-balance/export?${buildQS()}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `leave-balance-${year}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const hasActiveFilters = !!(employee || departmentId || leaveTypeId)
  const currentYear = new Date().getFullYear()

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
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
          value={leaveTypeId}
          onChange={(e) => setLeaveTypeId(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">ทุกประเภทการลา</option>
          {leaveTypes.map((lt) => (
            <option key={lt.id} value={lt.id}>{lt.name}</option>
          ))}
        </select>

        {/* Year */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          {yearOptions.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
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
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              ล้างตัวกรอง
            </button>
          )}
          <span className="text-xs text-muted-foreground pl-1">{total.toLocaleString()} รายการ</span>
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
