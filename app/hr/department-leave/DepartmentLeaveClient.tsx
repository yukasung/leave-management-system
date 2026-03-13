'use client'

import { useRouter, useParams } from 'next/navigation'
import { useState, useCallback } from 'react'
import { Download, SlidersHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import HolidayDatePicker from '@/app/components/HolidayDatePicker'

type LeaveType = { id: string; name: string }
type DeptRow = {
  id: string
  name: string
  empCount: number
  requestCount: number
  totalDays: number
  uniqueEmployees: number
}
type Summary = { totalRequests: number; totalDays: number; totalEmployees: number }
type Filters = { dateFrom?: string; dateTo?: string; leaveTypeId?: string }

interface Props {
  leaveTypes:    LeaveType[]
  byDepartment:  DeptRow[]
  summary:       Summary
  filters:       Filters
}

function toThaiDate(iso: string) {
  const date = new Date(iso + 'T00:00:00')
  return date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

const CHART_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444',
  '#8b5cf6', '#06b6d4', '#f97316', '#ec4899',
  '#14b8a6', '#a855f7', '#fb923c', '#64748b',
]

// ── SVG Horizontal Bar Chart ─────────────────────────────────────────────────
function HorizontalBarChart({ data }: { data: DeptRow[] }) {
  const chartData = data.filter((d) => d.totalDays > 0).slice(0, 12)
  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-52 text-muted-foreground text-sm">
        ไม่มีข้อมูล
      </div>
    )
  }

  const maxDays    = Math.max(...chartData.map((d) => d.totalDays), 1)
  const ROW_H      = 34
  const GAP        = 8
  const LEFT_PAD   = 120
  const RIGHT_PAD  = 54
  const TOP_PAD    = 10
  const BOTTOM_PAD = 10
  const CHART_W    = 460
  const totalH     = TOP_PAD + chartData.length * (ROW_H + GAP) - GAP + BOTTOM_PAD

  return (
    <div className="overflow-x-auto w-full">
      <svg
        viewBox={`0 0 ${LEFT_PAD + CHART_W + RIGHT_PAD} ${totalH}`}
        style={{ minWidth: 320, width: '100%', height: 'auto' }}
        aria-label="แผนภูมิแท่งวันลาตามแผนก"
      >
        {/* Vertical grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const x = LEFT_PAD + ratio * CHART_W
          const label = Number((ratio * maxDays).toFixed(1))
          return (
            <g key={ratio}>
              <line
                x1={x} y1={TOP_PAD} x2={x} y2={totalH - BOTTOM_PAD}
                stroke="currentColor" strokeWidth={0.5} opacity={0.1}
                strokeDasharray={ratio === 0 ? undefined : '4 3'}
              />
              <text
                x={x} y={totalH - BOTTOM_PAD + 12}
                textAnchor="middle" fontSize={8}
                fill="currentColor" opacity={0.4}
              >
                {label % 1 === 0 ? label : label.toFixed(1)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {chartData.map((d, i) => {
          const barW  = Math.max((d.totalDays / maxDays) * CHART_W, 2)
          const y     = TOP_PAD + i * (ROW_H + GAP)
          const color = CHART_COLORS[i % CHART_COLORS.length]
          const label = d.totalDays % 1 === 0 ? String(d.totalDays) : d.totalDays.toFixed(1)
          const shortName = d.name.length > 16 ? d.name.slice(0, 15) + '…' : d.name

          return (
            <g key={d.id}>
              {/* Dept label */}
              <text
                x={LEFT_PAD - 8} y={y + ROW_H / 2 + 3.5}
                textAnchor="end" fontSize={9.5}
                fill="currentColor" opacity={0.65}
              >
                {shortName}
              </text>
              {/* Bar background */}
              <rect
                x={LEFT_PAD} y={y} width={CHART_W} height={ROW_H}
                fill="currentColor" opacity={0.04} rx={5}
              />
              {/* Bar fill */}
              <rect
                x={LEFT_PAD} y={y} width={barW} height={ROW_H}
                fill={color} rx={5} opacity={0.82}
              />
              {/* Highlight */}
              <rect
                x={LEFT_PAD + 2} y={y + 2} width={Math.min(barW - 4, 40)} height={Math.min(6, ROW_H - 4)}
                fill="white" rx={3} opacity={0.12}
              />
              {/* Value label */}
              <text
                x={LEFT_PAD + barW + 6} y={y + ROW_H / 2 + 3.5}
                textAnchor="start" fontSize={10}
                fill={color} fontWeight="700"
              >
                {label}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function DepartmentLeaveClient({ leaveTypes, byDepartment, summary, filters }: Props) {
  const router  = useRouter()
  const params  = useParams()
  const locale  = (params?.locale as string) || ''
  const base    = locale ? `/${locale}/hr/department-leave` : '/hr/department-leave'

  const [dateFrom,    setDateFrom]    = useState(filters.dateFrom    ?? '')
  const [dateTo,      setDateTo]      = useState(filters.dateTo      ?? '')
  const [leaveTypeId, setLeaveTypeId] = useState(filters.leaveTypeId ?? '')
  const [exporting,   setExporting]   = useState(false)

  const applyFilters = useCallback(() => {
    const q = new URLSearchParams()
    if (dateFrom)    q.set('dateFrom',    dateFrom)
    if (dateTo)      q.set('dateTo',      dateTo)
    if (leaveTypeId) q.set('leaveTypeId', leaveTypeId)
    router.push(`${base}?${q.toString()}`)
  }, [dateFrom, dateTo, leaveTypeId, base, router])

  const clearFilters = useCallback(() => {
    setDateFrom(''); setDateTo(''); setLeaveTypeId('')
    router.push(base)
  }, [base, router])

  const handleExport = async () => {
    setExporting(true)
    const q = new URLSearchParams()
    if (filters.dateFrom)    q.set('dateFrom',    filters.dateFrom)
    if (filters.dateTo)      q.set('dateTo',      filters.dateTo)
    if (filters.leaveTypeId) q.set('leaveTypeId', filters.leaveTypeId)
    try {
      const res  = await fetch(`/api/hr/department-leave/export?${q.toString()}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url; a.download = 'department-leave-report.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Export error:', err)
    } finally {
      setExporting(false)
    }
  }

  const hasFilters  = !!(filters.dateFrom || filters.dateTo || filters.leaveTypeId)

  return (
    <div className="space-y-6 max-w-350 mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-foreground">รายงานการลาตามแผนก</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            วิเคราะห์การใช้วันลาแยกตามแผนก
            {hasFilters && filters.dateFrom && (
              <span className="ml-2 text-primary font-medium">
                · {toThaiDate(filters.dateFrom)}{filters.dateTo ? ` – ${toThaiDate(filters.dateTo)}` : ''}
              </span>
            )}
          </p>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-muted transition-colors"
          >
            <span>×</span> ล้างตัวกรอง
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">ตัวกรอง</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">วันที่เริ่มต้น</label>
            <HolidayDatePicker name="dateFrom" value={dateFrom} onChange={setDateFrom} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">วันที่สิ้นสุด</label>
            <HolidayDatePicker name="dateTo" value={dateTo} onChange={setDateTo} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">ประเภทการลา</label>
            <select
              value={leaveTypeId} onChange={(e) => setLeaveTypeId(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">ทุกประเภท</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>{lt.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={applyFilters}
            className="h-9 px-5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            ค้นหา
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="h-9 px-4 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              ล้าง
            </button>
          )}
        </div>
      </div>

      {/* Detail table (full width) */}
      {byDepartment.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <h2 className="text-sm font-semibold text-foreground">รายละเอียดทุกแผนก</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{byDepartment.length} แผนก</p>
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-10">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-36">แผนก</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-24">จำนวนพนักงาน</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-20">คำขอลา</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-24">พนักงานที่ลา</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-24">วันลารวม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {byDepartment.map((d, i) => {
                  const pct   = d.empCount > 0 ? (d.uniqueEmployees / d.empCount) * 100 : 0
                  const color = CHART_COLORS[i % CHART_COLORS.length]
                  return (
                    <tr key={d.id} className="hover:bg-primary/3 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{i + 1}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-medium text-foreground">{d.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground whitespace-nowrap">{d.empCount}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground whitespace-nowrap">{d.requestCount}</td>
                      <td className="px-4 py-3 text-center tabular-nums text-muted-foreground whitespace-nowrap">
                        {d.uniqueEmployees}
                        {d.empCount > 0 && d.uniqueEmployees > 0 && (
                          <span className="text-xs ml-1 text-muted-foreground/50">
                            ({pct.toFixed(0)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-foreground whitespace-nowrap">
                        {d.totalDays % 1 === 0 ? d.totalDays : d.totalDays.toFixed(1)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
