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
import { formatLeaveDuration } from '@/lib/leave-calc'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { buttonVariants } from '@/lib/button-variants'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 15

export default async function HRLeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; search?: string; page?: string }>
}) {
  const { status, search, page: pageParam } = await searchParams
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

  const VALID_STATUSES = ['DRAFT', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED', 'CANCEL_REQUESTED']
  const whereStatus =
    activeStatus !== 'ALL' && VALID_STATUSES.includes(activeStatus)
      ? (activeStatus as LeaveStatus)
      : undefined

  const where = {
    ...(whereStatus ? { status: whereStatus } : {}),
    ...(search ? { user: { name: { contains: search, mode: 'insensitive' as const } } } : {}),
  }

  const [requests, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true } },
      },
    }),
    prisma.leaveRequest.count({ where }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function pageUrl(p: number) {
    const q = new URLSearchParams()
    if (activeStatus !== 'PENDING') q.set('status', activeStatus)
    if (search) q.set('search', search)
    q.set('page', String(p))
    return `/hr/leave-requests?${q.toString()}`
  }

  function tabUrl(tab: string) {
    const q = new URLSearchParams()
    if (tab !== 'PENDING') q.set('status', tab)
    if (search) q.set('search', search)
    const qs = q.toString()
    return `/hr/leave-requests${qs ? `?${qs}` : ''}`
  }

  const tabs = ['ALL', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCEL_REQUESTED'] as const

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
          <a
            href="/api/export/leave"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            ส่งออก CSV
          </a>
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
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ชื่อพนักงาน</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">แผนก</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ประเภทการลา</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่เริ่ม</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่สิ้นสุด</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">จำนวนวัน</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">สถานะ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req, index) => (
                    <tr key={req.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{skip + index + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{req.user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {req.user.department?.name ?? (
                          <span className="italic text-muted-foreground/50">ไม่ระบุ</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{req.leaveType.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(req.leaveStartDateTime)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(req.leaveEndDateTime)}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{formatLeaveDuration(req.totalDays)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BADGE_NEW[req.status] ?? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[req.status] ?? 'bg-gray-400'}`} />
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
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
