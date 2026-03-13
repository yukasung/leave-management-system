import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin-layout'
import LeaveBalanceReportFilters from './LeaveBalanceReportFilters'
import Pagination from '@/components/Pagination'
import { cn } from '@/lib/utils'
import { AlertTriangle, XCircle, CheckCircle2, Users } from 'lucide-react'
import { StatCard } from '@/components/dashboard-cards'

type SearchParams = {
  employee?:     string
  departmentId?: string
  leaveTypeId?:  string
  year?:         string
  page?:         string
}

const PAGE_SIZE = 20

export default async function LeaveBalanceReportPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session?.user.isAdmin) redirect('/login')

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

  const { employee, departmentId, leaveTypeId, year: yearParam, page: pageParam } = await searchParams
  const currentYear = new Date().getFullYear()
  const year = yearParam ? parseInt(yearParam, 10) : currentYear
  const page = Math.max(1, pageParam ? parseInt(pageParam, 10) : 1)

  // Collect available years from the balance table
  const allYears = await prisma.leaveBalance.findMany({
    select: { year: true },
    distinct: ['year'],
  })
  const yearSet = new Set(allYears.map((r) => r.year))
  yearSet.add(currentYear)
  const yearOptions = Array.from(yearSet).sort((a, b) => b - a)

  const where = {
    year,
    ...(leaveTypeId ? { leaveTypeId } : {}),
    user: {
      ...(employee     ? { name: { contains: employee, mode: 'insensitive' as const } } : {}),
      ...(departmentId ? { departmentId } : {}),
    },
  }

  const [total, balances, departments, leaveTypes] = await Promise.all([
    prisma.leaveBalance.count({ where }),
    prisma.leaveBalance.findMany({
      where,
      orderBy: [{ user: { name: 'asc' } }, { leaveType: { name: 'asc' } }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: {
          select: {
            name: true,
            employee: { select: { employeeCode: true } },
            department: { select: { name: true } },
          },
        },
        leaveType: { select: { name: true } },
      },
    }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.leaveType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  // Summary counts across ALL matching records (not just current page)
  const allSummary = await prisma.leaveBalance.findMany({
    where,
    select: { totalDays: true, usedDays: true },
  })
  const exhausted = allSummary.filter((b) => b.totalDays - b.usedDays <= 0).length
  const low       = allSummary.filter((b) => {
    const rem = b.totalDays - b.usedDays
    return rem > 0 && b.totalDays > 0 && (b.usedDays / b.totalDays) >= 0.75
  }).length
  const normalCount = allSummary.length - exhausted - low

  return (
    <AdminLayout title="รายงานยอดวันลาคงเหลือ" user={user}>
      <div className="space-y-5 max-w-350 mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">รายงานยอดวันลาคงเหลือ</h1>
            <p className="text-sm text-muted-foreground mt-0.5">ปี {year + 543} · สรุปวันลาคงเหลือของพนักงานทุกคน</p>
          </div>
        </div>

        {/* Alert summary cards */}
        {(exhausted > 0 || low > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exhausted > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-950/30 px-4 py-3">
                <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                    หมดโควตา {exhausted} รายการ
                  </p>
                  <p className="text-xs text-red-600/70 dark:text-red-400/60">พนักงานที่ใช้วันลาครบทั้งหมดแล้ว</p>
                </div>
              </div>
            )}
            {low > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/50 dark:bg-amber-950/30 px-4 py-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    เหลือน้อย {low} รายการ
                  </p>
                  <p className="text-xs text-amber-600/70 dark:text-amber-400/60">ใช้วันลาไปแล้ว ≥ 75% ของโควตา</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filters */}
        <LeaveBalanceReportFilters
          departments={departments}
          leaveTypes={leaveTypes}
          yearOptions={yearOptions}
          total={total}
          current={{ employee, departmentId, leaveTypeId, year }}
        />

        {/* Table */}
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <p className="text-muted-foreground">ไม่พบข้อมูลยอดวันลา</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap w-10">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-36">ชื่อพนักงาน</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-28">แผนก</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-32">ประเภทการลา</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-24">โควตา (วัน)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-24">ใช้ไปแล้ว (วัน)</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap min-w-24">คงเหลือ (วัน)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {balances.map((b, index) => {
                    const rowIndex  = (page - 1) * PAGE_SIZE + index + 1
                    const remaining = b.totalDays - b.usedDays
                    const pct       = b.totalDays > 0 ? (b.usedDays / b.totalDays) * 100 : 0
                    const isEmpty   = remaining <= 0
                    const isLow     = !isEmpty && pct >= 75
                    const isOk      = !isEmpty && !isLow

                    return (
                      <tr
                        key={b.id}
                        className={cn(
                          'transition-colors',
                          isEmpty
                            ? 'bg-red-50/60 dark:bg-red-950/20 hover:bg-red-50 dark:hover:bg-red-950/30'
                            : isLow
                            ? 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                            : 'hover:bg-primary/3 dark:hover:bg-primary/10',
                        )}
                      >
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{rowIndex}</td>

                        {/* Name + code */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <p className="font-medium text-foreground">{b.user.name}</p>
                          {b.user.employee?.employeeCode && (
                            <p className="text-xs font-mono text-muted-foreground/60 mt-0.5">
                              {b.user.employee.employeeCode}
                            </p>
                          )}
                        </td>

                        {/* Department */}
                        <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">
                          {b.user.department?.name ?? <span className="italic opacity-40">—</span>}
                        </td>

                        {/* Leave type */}
                        <td className="px-4 py-3 text-center text-muted-foreground whitespace-nowrap">{b.leaveType.name}</td>

                        {/* Entitlement */}
                        <td className="px-4 py-3 text-center tabular-nums text-foreground font-medium whitespace-nowrap">
                          {b.totalDays % 1 === 0 ? b.totalDays : b.totalDays.toFixed(1)}
                        </td>

                        {/* Used */}
                        <td className="px-4 py-3 text-center tabular-nums text-muted-foreground whitespace-nowrap">
                          {b.usedDays % 1 === 0 ? b.usedDays : b.usedDays.toFixed(1)}
                        </td>

                        {/* Remaining */}
                        <td className="px-4 py-3 text-center tabular-nums whitespace-nowrap">
                          <span className={cn(
                            'font-semibold',
                            isEmpty ? 'text-red-600 dark:text-red-400' :
                            isLow   ? 'text-amber-600 dark:text-amber-400' :
                                      'text-emerald-600 dark:text-emerald-400',
                          )}>
                            {remaining <= 0 ? 0 : remaining % 1 === 0 ? remaining : remaining.toFixed(1)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <Pagination page={page} totalPages={totalPages} total={total} pageSize={PAGE_SIZE} />
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
