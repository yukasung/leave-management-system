import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import AdminLayout from '@/components/admin-layout'
import { LeaveTable, type LeaveRow } from '@/components/leave-table'
import { buttonVariants } from '@/lib/button-variants'
import LeaveRequestFilters from './LeaveRequestFilters'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { LeaveStatus } from '@prisma/client'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 15

export default async function LeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const { search, status, page: pageParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10))
  const skip = (currentPage - 1) * PAGE_SIZE

  // Validate status against the enum values to prevent injection
  const VALID_STATUSES: LeaveStatus[] = ['DRAFT', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED']
  const safeStatus = status && VALID_STATUSES.includes(status as LeaveStatus)
    ? (status as LeaveStatus)
    : undefined

  const where = {
    ...(safeStatus ? { status: safeStatus } : {}),
    ...(search
      ? {
          user: {
            name: { contains: search, mode: 'insensitive' as const },
          },
        }
      : {}),
  }

  const [requests, total, dbUser] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: { createdAt: 'desc' },
      include: {
        user:      { select: { name: true, avatarUrl: true } },
        leaveType: { select: { name: true } },
      },
    }),
    prisma.leaveRequest.count({ where }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function pageUrl(p: number) {
    const q = new URLSearchParams()
    if (search) q.set('search', search)
    if (status) q.set('status', status)
    q.set('page', String(p))
    return `/leave-requests?${q.toString()}`
  }

  const rows: LeaveRow[] = requests.map((r) => ({
    id:        r.id,
    employee:  { name: r.user.name, avatarUrl: r.user.avatarUrl },
    leaveType: r.leaveType.name,
    leaveStartDateTime: r.leaveStartDateTime,
    leaveEndDateTime:   r.leaveEndDateTime,
    totalDays: r.totalDays,
    status:    r.status,
  }))

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="คำขอลาทั้งหมด" user={user}>
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">คำขอลาทั้งหมด</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              ทั้งหมด {total} รายการ
            </p>
          </div>
          <Link href="/hr/leave-requests" className={buttonVariants()}>
            จัดการมุมมอง HR
          </Link>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Suspense>
            <LeaveRequestFilters search={search ?? ''} status={status ?? ''} />
          </Suspense>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          <LeaveTable rows={rows} />
        </div>

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
