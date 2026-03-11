import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { LeaveStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { HRActionButtons } from './HRActionButtons'
import AdminLayout from '@/components/admin-layout'

const STATUS_LABELS: Record<string, string> = {
  ALL:              'ทั้งหมด',
  PENDING:          'รออนุมัติ',
  IN_REVIEW:        'รอ HR',
  APPROVED:         'อนุมัติแล้ว',
  REJECTED:         'ปฏิเสธ',
  CANCELLED:        'ยกเลิกแล้ว',
  CANCEL_REQUESTED: 'ขอยกเลิก',
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const STATUS_BADGE_NEW: Record<string, string> = {
  PENDING:          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  IN_REVIEW:        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
  APPROVED:         'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED:         'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  CANCELLED:        'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700',
  CANCEL_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
}

const STATUS_DOT: Record<string, string> = {
  PENDING:          'bg-amber-500',
  IN_REVIEW:        'bg-blue-500',
  APPROVED:         'bg-emerald-500',
  REJECTED:         'bg-red-500',
  CANCELLED:        'bg-gray-400',
  CANCEL_REQUESTED: 'bg-orange-500',
}

import { formatDate } from '@/lib/format-date'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 10

export default async function HRLeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string; year?: string; sort?: string; dir?: string }>
}) {
  const { status, search, page: pageParam, year: yearParam, sort: sortParam, dir: dirParam } = await searchParams
  const session = await auth()

  if (!session || !session.user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-lg font-semibold">ไม่มีสิทธิ์เข้าถึง</p>
      </div>
    )
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarUrl: true },
  })
  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  const activeStatus = (status ?? 'PENDING').toUpperCase()
  const currentPage  = Math.max(1, parseInt(pageParam ?? '1', 10))
  const skip         = (currentPage - 1) * PAGE_SIZE
  const currentYear  = new Date().getFullYear()
  const selectedYear = parseInt(yearParam ?? String(currentYear), 10)
  const yearStart    = new Date(selectedYear, 0, 1)
  const yearEnd      = new Date(selectedYear + 1, 0, 1)

  const VALID_STATUSES = ['DRAFT', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'CANCEL_REQUESTED']
  const whereStatus =
    activeStatus !== 'ALL' && VALID_STATUSES.includes(activeStatus)
      ? (activeStatus as LeaveStatus)
      : undefined

  const where = {
    ...(whereStatus ? { status: whereStatus } : {}),
    ...(search ? { user: { name: { contains: search, mode: 'insensitive' as const } } } : {}),
    leaveStartDateTime: { gte: yearStart, lt: yearEnd },
  }

  const allDates = await prisma.leaveRequest.findMany({
    select: { leaveStartDateTime: true },
    distinct: ['leaveStartDateTime'],
  })
  const yearSet = new Set(allDates.map((r) => r.leaveStartDateTime.getFullYear()))
  if (!yearSet.has(currentYear)) yearSet.add(currentYear)
  const yearOptions = Array.from(yearSet).sort((a, b) => b - a)

  const VALID_SORTS = ['name', 'department', 'leaveType', 'startDate', 'endDate', 'totalDays', 'status', 'createdAt'] as const
  type SortKey = typeof VALID_SORTS[number]
  const sortKey: SortKey = (VALID_SORTS as readonly string[]).includes(sortParam ?? '') ? (sortParam as SortKey) : 'createdAt'
  const sortDir: 'asc' | 'desc' = dirParam === 'asc' ? 'asc' : 'desc'

  const ORDER_BY: Record<SortKey, object> = {
    name:       { user: { name: sortDir } },
    department: { user: { department: { name: sortDir } } },
    leaveType:  { leaveType: { name: sortDir } },
    startDate:  { leaveStartDateTime: sortDir },
    endDate:    { leaveEndDateTime: sortDir },
    totalDays:  { totalDays: sortDir },
    status:     { status: sortDir },
    createdAt:  { createdAt: sortDir },
  }

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: ORDER_BY[sortKey],
      select: {
        id: true,
        createdAt: true,
        leaveStartDateTime: true,
        leaveEndDateTime: true,
        totalDays: true,
        status: true,
        user: { select: { name: true, department: { select: { name: true } } } },
        leaveType: { select: { name: true } },
      },
    }),
    prisma.leaveRequest.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function buildQuery(overrides: Record<string, string | undefined> = {}) {
    const q = new URLSearchParams()
    const merged = { status: activeStatus !== 'PENDING' ? activeStatus : undefined, search: search || undefined, year: selectedYear !== currentYear ? String(selectedYear) : undefined, sort: sortKey !== 'createdAt' ? sortKey : undefined, dir: sortDir !== 'desc' ? sortDir : undefined, ...overrides }
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v)
    const qs = q.toString()
    return `/hr/leave-requests${qs ? `?${qs}` : ''}`
  }

  function pageUrl(p: number) { return buildQuery({ page: p > 1 ? String(p) : undefined }) }
  function tabUrl(tab: string) { return buildQuery({ status: tab !== 'PENDING' ? tab : undefined, page: undefined }) }
  function sortUrl(col: string) {
    const newDir = sortKey === col && sortDir === 'desc' ? 'asc' : 'desc'
    return buildQuery({ sort: col !== 'createdAt' ? col : undefined, dir: newDir !== 'desc' ? newDir : undefined, page: undefined })
  }

  const tabs = ['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'CANCEL_REQUESTED'] as const

  return (
    <AdminLayout title="คำขอลาทั้งหมด" user={user}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">ประวัติคำขอลาทั้งหมด</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total} รายการ
              {activeStatus !== 'ALL' ? ` · กรอง: ${STATUS_LABELS[activeStatus] ?? activeStatus}` : ''}
            </p>
          </div>

        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => {
            const isActive = activeStatus === tab
            return (
              <Link
                key={tab}
                href={tabUrl(tab)}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {STATUS_LABELS[tab]}
              </Link>
            )
          })}
        </div>

        {/* Search */}
        <form method="get" action="/hr/leave-requests" className="rounded-xl border border-border bg-card p-4 shadow-sm flex items-center gap-2">
          {activeStatus !== 'PENDING' && <input type="hidden" name="status" value={activeStatus} />}
          <div className="relative min-w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              name="search"
              defaultValue={search ?? ''}
              placeholder="ค้นหาพนักงาน…"
              className="pl-8 h-8 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <select
            name="year"
            defaultValue={String(selectedYear)}
            className="h-8 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {yearOptions.map((y) => (
              <option key={y} value={String(y)}>{y + 543}</option>
            ))}
          </select>
        </form>

        {/* Table */}
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <p className="text-muted-foreground">ไม่พบรายการ</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">#</th>
                    {([
                      { col: 'name',      label: 'ชื่อพนักงาน', center: false },
                      { col: 'department', label: 'แผนก',       center: false },
                      { col: 'leaveType', label: 'ประเภทการลา', center: true },
                      { col: 'startDate', label: 'วันที่เริ่ม',  center: true },
                      { col: 'endDate',   label: 'วันที่สิ้นสุด', center: true },
                      { col: 'totalDays', label: 'จำนวนวัน',    center: true },
                      { col: 'status',    label: 'สถานะ',        center: true },
                      { col: 'createdAt', label: 'วันที่ขอ',      center: true },
                    ] as const).map(({ col, label, center }) => (
                      <th key={col} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap ${center ? 'text-center' : 'text-left'}`}>
                        <Link href={sortUrl(col)} className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
                          {label}
                          {sortKey === col
                            ? sortDir === 'asc'
                              ? <ChevronUp className="h-3 w-3" />
                              : <ChevronDown className="h-3 w-3" />
                            : <ChevronsUpDown className="h-3 w-3 opacity-40" />}
                        </Link>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req, index) => (
                    <tr key={req.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{skip + index + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{req.user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {req.user.department?.name ?? (
                          <span className="italic text-muted-foreground/50">ไม่ระบุ</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{req.leaveType.name}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{formatDate(req.leaveStartDateTime)}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{formatDate(req.leaveEndDateTime)}</td>
                      <td className="px-4 py-3 text-center font-semibold text-foreground whitespace-nowrap">{parseFloat(Number(req.totalDays).toFixed(2))}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BADGE_NEW[req.status] ?? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[req.status] ?? 'bg-gray-400'}`} />
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{formatDate(req.createdAt)}</td>
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        {(req.status === 'PENDING' || req.status === 'IN_REVIEW' || req.status === 'CANCEL_REQUESTED') ? (
                          <HRActionButtons id={req.id} status={req.status} />
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              แสดง {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} จาก {total} รายการ
            </p>
            <div className="flex items-center gap-1">
              {currentPage > 1 ? (
                <Link href={pageUrl(currentPage - 1)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 w-8 p-0')}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button disabled className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 w-8 p-0')}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
              )}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = currentPage <= 3
                  ? i + 1
                  : currentPage >= totalPages - 2
                  ? totalPages - 4 + i
                  : currentPage - 2 + i
                if (p < 1 || p > totalPages) return null
                return p === currentPage ? (
                  <button key={p} className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'h-8 w-8 p-0 text-xs')}>
                    {p}
                  </button>
                ) : (
                  <Link key={p} href={pageUrl(p)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 w-8 p-0 text-xs')}>
                    {p}
                  </Link>
                )
              })}
              {currentPage < totalPages ? (
                <Link href={pageUrl(currentPage + 1)} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 w-8 p-0')}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              ) : (
                <button disabled className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-8 w-8 p-0')}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
