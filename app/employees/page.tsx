import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import AdminLayout from '@/components/admin-layout'
import { buttonVariants } from '@/lib/button-variants'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'
import EmployeeFilters from './EmployeeFilters'

const PAGE_SIZE = 15

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; department?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const { search, department, page: pageParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10))
  const skip = (currentPage - 1) * PAGE_SIZE

  const where = {
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName:  { contains: search, mode: 'insensitive' as const } },
            { email:     { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(department ? { departmentId: department } : {}),
  }

  const [employees, total, departments, dbUser] = await Promise.all([
    prisma.employee.findMany({
      where,
      skip,
      take: PAGE_SIZE,
      orderBy: [{ department: { name: 'asc' } }, { firstName: 'asc' }],
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        email: true,
        avatarUrl: true,
        position: true,
        isAdmin: true,
        isActive: true,
        isProbation: true,
        department: { select: { id: true, name: true } },
      },
    }),
    prisma.employee.count({ where }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function pageUrl(p: number) {
    const q = new URLSearchParams()
    if (search)     q.set('search',     search)
    if (department) q.set('department', department)
    q.set('page', String(p))
    return `/employees?${q.toString()}`
  }

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="Employees" user={user}>
      <div className="space-y-5 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Employees</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {total} employee{total !== 1 ? 's' : ''} total
            </p>
          </div>
          <Link href="/admin/employees/new" className={buttonVariants()}>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add Employee
            </Link>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <Suspense>
            <EmployeeFilters
              search={search ?? ''}
              department={department ?? ''}
              departments={departments}
            />
          </Suspense>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {employees.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">No employees found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Employee
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Department
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Position
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((emp) => {
                    const fullName = `${emp.firstName} ${emp.lastName}`
                    const initials = `${emp.firstName[0]}${emp.lastName[0]}`.toUpperCase()
                    return (
                      <TableRow key={emp.id} className="hover:bg-muted/30 transition-colors">
                        {/* Name */}
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground overflow-hidden">
                              {emp.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={emp.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                              ) : (
                                initials
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground leading-none">
                                {fullName}
                              </p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {emp.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        {/* Department */}
                        <TableCell className="text-sm text-muted-foreground">
                          {emp.department?.name ?? '—'}
                        </TableCell>
                        {/* Position */}
                        <TableCell className="text-sm text-muted-foreground">
                          {emp.position ?? '—'}
                        </TableCell>
                        {/* Status badges */}
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                                emp.isActive
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-gray-100 text-gray-500 border-gray-200',
                              )}
                            >
                              {emp.isActive ? 'Active' : 'Inactive'}
                            </span>
                            {emp.isAdmin && (
                              <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                Admin
                              </span>
                            )}
                            {emp.isProbation && (
                              <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                                Probation
                              </span>
                            )}
                          </div>
                        </TableCell>
                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/admin/employees/${emp.id}`}
                              className={buttonVariants({ variant: 'ghost', size: 'xs' })}
                            >
                              Edit
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {skip + 1}–{Math.min(skip + PAGE_SIZE, total)} of {total}
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
                const p = currentPage <= 3 ? i + 1
                  : currentPage >= totalPages - 2 ? totalPages - 4 + i
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
