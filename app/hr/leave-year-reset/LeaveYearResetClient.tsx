'use client'

import { useState, useTransition } from 'react'
import { resetLeaveYear, type ResetResult } from './actions'
import { AlertTriangle, RefreshCw, CheckCircle2, XCircle, CalendarCog } from 'lucide-react'

type YearSummary = { year: number; count: number }

export default function LeaveYearResetClient({
  yearSummary,
  currentYear,
}: {
  yearSummary: YearSummary[]
  currentYear: number
}) {
  const existingYears = new Set(yearSummary.map((r) => r.year))

  const [selectedYear, setSelectedYear] = useState<number>(currentYear + 1)
  const [showModal, setShowModal]       = useState(false)
  const [result, setResult]             = useState<ResetResult | null>(null)
  const [isPending, startTransition]    = useTransition()

  const alreadyExists = existingYears.has(selectedYear)

  function openModal() {
    setResult(null)
    setShowModal(true)
  }

  function confirmReset() {
    setShowModal(false)
    startTransition(async () => {
      const res = await resetLeaveYear(selectedYear)
      setResult(res)
    })
  }

  // Year options: last 2 years up to next 13 years
  const yearOptions = Array.from({ length: 16 }, (_, i) => currentYear - 2 + i)

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Year selector card */}
      <div className="bg-card rounded-2xl shadow-sm border border-border p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <CalendarCog className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">เลือกปีที่ต้องการรีเซ็ต</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ระบบจะสร้างข้อมูลยอดวันลาสำหรับพนักงานทุกคนตามโควตาของแต่ละประเภทการลา
            </p>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">ปี (พ.ศ.)</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(Number(e.target.value))
                setResult(null)
              }}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  พ.ศ. {y + 543}
                  {existingYears.has(y) ? ' — มีข้อมูลแล้ว' : ''}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={openModal}
            disabled={isPending || alreadyExists}
            className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium transition hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            รีเซ็ตยอดวันลา
          </button>
        </div>

        {alreadyExists && (
          <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            พ.ศ. {selectedYear + 543} มีข้อมูลอยู่แล้ว — เลือกปีอื่น
          </p>
        )}
      </div>

      {/* Result banner */}
      {result && (
        <div
          className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
            result.success
              ? 'border-green-200 bg-green-50 text-green-800 dark:border-green-800/50 dark:bg-green-950/40 dark:text-green-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-800/50 dark:bg-red-950/40 dark:text-red-300'
          }`}
        >
          {result.success ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-medium">{result.message}</p>
            {result.success && result.created != null && (
              <p className="mt-0.5 text-xs opacity-80">สร้างข้อมูลยอดวันลารวม {result.created} รายการ</p>
            )}
          </div>
        </div>
      )}

      {/* Existing years summary */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <p className="text-sm font-semibold text-foreground">ข้อมูลยอดวันลาที่มีอยู่</p>
        </div>
        {yearSummary.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">ยังไม่มีข้อมูล</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="px-5 py-3 text-left">ปี</th>
                <th className="px-5 py-3">จำนวนรายการ</th>
                <th className="px-5 py-3">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {yearSummary.map(({ year, count }) => (
                <tr key={year} className="hover:bg-muted/40 transition text-center">
                  <td className="px-5 py-3 text-left font-medium text-foreground">
                    พ.ศ. {year + 543}
                  </td>
                  <td className="px-5 py-3 text-foreground">{count.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      <CheckCircle2 className="h-3 w-3" />
                      มีข้อมูลแล้ว
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6 space-y-5 mx-4">
            {/* Icon + title */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">ยืนยันการรีเซ็ตยอดวันลา</h3>
                <p className="text-xs text-muted-foreground mt-0.5">โปรดตรวจสอบข้อมูลก่อนดำเนินการ</p>
              </div>
            </div>

            {/* Details */}
            <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ปีที่รีเซ็ต</span>
                <span className="font-semibold text-foreground">
                  พ.ศ. {selectedYear + 543}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ยอดที่ใช้ไป (usedDays)</span>
                <span className="font-semibold text-foreground">ตั้งเป็น 0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">วันลาที่ได้รับ</span>
                <span className="font-semibold text-foreground">ตามโควตาของแต่ละประเภทการลา</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              การดำเนินการนี้ไม่สามารถย้อนกลับได้ ระบบจะสร้างข้อมูลยอดวันลาใหม่ทั้งหมดสำหรับปีที่เลือก
            </p>

            {/* Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmReset}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition"
              >
                <RefreshCw className="h-4 w-4" />
                ยืนยัน รีเซ็ตยอดวันลา
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
