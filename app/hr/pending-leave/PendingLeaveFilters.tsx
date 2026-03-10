'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { X, Download } from 'lucide-react'
import { cn } from '@/lib/utils'
import HolidayDatePicker from '@/app/components/HolidayDatePicker'

type Department = { id: string; name: string }
type Approver   = { id: string; name: string }

interface Props {
  departments: Department[]
  approvers:   Approver[]
  current: {
    approverId?:   string
    departmentId?: string
    dateFrom?:     string
    dateTo?:       string
    dir?:          string
  }
  total:    number
  overdue:  number
}

export default function PendingLeaveFilters({ departments, approvers, current, total, overdue }: Props) {
  const router  = useRouter()
  const params  = useParams()
  const locale  = (params?.locale as string) || ''
  const base    = locale ? `/${locale}/hr/pending-leave` : '/hr/pending-leave'

  const [approverId,   setApproverId]   = useState(current.approverId   ?? '')
  const [departmentId, setDepartmentId] = useState(current.departmentId ?? '')
  const [dateFrom,     setDateFrom]     = useState(current.dateFrom     ?? '')
  const [dateTo,       setDateTo]       = useState(current.dateTo       ?? '')
  const [exporting,    setExporting]    = useState(false)

  const buildQS = useCallback(
    (overrides: Record<string, string> = {}) => {
      const q = new URLSearchParams()
      const vals: Record<string, string> = {
        approverId, departmentId, dateFrom, dateTo,
        dir: current.dir ?? '',
        ...overrides,
      }
      for (const [k, v] of Object.entries(vals)) if (v) q.set(k, v)
      return q.toString()
    },
    [approverId, departmentId, dateFrom, dateTo, current.dir],
  )

  const applyFilters = useCallback(() => {
    router.push(`${base}?${buildQS()}`)
  }, [base, buildQS, router])

  const clearFilters = useCallback(() => {
    setApproverId(''); setDepartmentId(''); setDateFrom(''); setDateTo('')
    router.push(base)
  }, [base, router])

  const handleExport = async () => {
    setExporting(true)
    try {
      const res  = await fetch(`/api/hr/pending-leave/export?${buildQS()}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = 'pending-leave-requests.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const hasFilters = !!(approverId || departmentId || dateFrom || dateTo)

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Approver */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">ผู้อนุมัติ</label>
          <select
            value={approverId}
            onChange={(e) => setApproverId(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">ทุกคน</option>
            {approvers.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">แผนก</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">ทุกแผนก</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>

        {/* Date from */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">ยื่นคำขอตั้งแต่</label>
          <HolidayDatePicker name="dateFrom" value={dateFrom} onChange={setDateFrom} />
        </div>

        {/* Date to */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">จนถึง</label>
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
            {overdue > 0 && (
              <span className="ml-2 font-semibold text-red-600 dark:text-red-400">
                · รอนานเกิน 3 วัน: {overdue} รายการ
              </span>
            )}
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
