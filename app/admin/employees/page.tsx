import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import EmployeeFilters from './EmployeeFilters'
import AdminLayout from '@/components/admin-layout'
import EmployeeRow from './EmployeeRow'

const PAGE_SIZE = 15

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; department?: string; page?: string; sort?: string; order?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  if (!session.user.isAdmin) redirect('/dashboard')

  const { search, department, page: pageParam, sort: sortParam, order: orderParam } = await searchParams
  const currentPage = Math.max(1, parseInt(pageParam ?? '1', 10))
  const skip = (currentPage - 1) * PAGE_SIZE

  const VALID_SORTS = ['employeeCode', 'firstName', 'department', 'position', 'isActive'] as const
  type SortKey = typeof VALID_SORTS[number]
  const sort: SortKey = VALID_SORTS.includes(sortParam as SortKey) ? (sortParam as SortKey) : 'department'
  const order = orderParam === 'asc' ? 'asc' : 'desc'
  const nextOrder = (col: SortKey) => (sort === col && order === 'asc' ? 'desc' : 'asc')

  const ORDER_BY: Record<SortKey, object | object[]> = {
    employeeCode: { employeeCode: order },
    firstName:    [{ firstName: order }, { lastName: order }],
    department:   [{ department: { name: order } }, { firstName: 'asc' as const }],
    position:     [{ positionRef: { name: order } }, { firstName: 'asc' as const }],
    isActive:     [{ isActive: order === 'asc' ? 'desc' as const : 'asc' as const }, { firstName: 'asc' as const }],
  }

  const where = {
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { employeeCode: { contains: search, mode: 'insensitive' as const } },
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
      orderBy: ORDER_BY[sort] as Parameters<typeof prisma.employee.findMany>[0]['orderBy'],
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        positionRef: { select: { name: true } },
        user: { select: { email: true, avatarUrl: true, role: { select: { name: true } } } },
        isActive: true,
        isProbation: true,
        department: { select: { id: true, name: true } },
      },
    }),
    prisma.employee.count({ where }),
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  function pageUrl(p: number, s = sort, o = order) {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (department) params.set('department', department)
    params.set('sort', s)
    params.set('order', o)
    params.set('page', String(p))
    return `/admin/employees?${params.toString()}`
  }

  function sortUrl(col: SortKey) {
    return pageUrl(1, col, nextOrder(col))
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sort !== col) return <span className="ml-1 opacity-30">?</span>
    return <span className="ml-1">{order === 'asc' ? '?' : '?'}</span>
  }

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="?????????????" user={user}>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">?????????????</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              ?????????????? {total.toLocaleString()} ??
              {search || department ? ' � ????????' : ''}
            </p>
          </div>
          <Link
            href="/admin/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition"
          >
            + ????????????????
          </Link>
        </div>

        {/* Filters */}
        <Suspense>
          <EmployeeFilters departments={departments} />
        </Suspense>

        {/* Table */}
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
          {employees.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <p className="text-lg">????????????</p>
              {(search || department) && (
                <p className="text-sm mt-1">????????????????????????????</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3.5 whitespace-nowrap">
                      <Link href={sortUrl('employeeCode')} className="inline-flex items-center hover:text-foreground transition-colors">
                        ???????????<SortIcon col="employeeCode" />
                      </Link>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap">
                      <Link href={sortUrl('firstName')} className="inline-flex items-center hover:text-foreground transition-colors">
                        ????-???????<SortIcon col="firstName" />
                      </Link>
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">
                      <Link href={sortUrl('department')} className="inline-flex items-center justify-center w-full hover:text-foreground transition-colors">
                        ????<SortIcon col="department" />
                      </Link>
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">
                      <Link href={sortUrl('position')} className="inline-flex items-center justify-center w-full hover:text-foreground transition-colors">
                        ???????<SortIcon col="position" />
                      </Link>
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">?????</th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">
                      <Link href={sortUrl('isActive')} className="inline-flex items-center justify-center w-full hover:text-foreground transition-colors">
                        ?????<SortIcon col="isActive" />
                      </Link>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => {
                    const roleName = emp.user?.role?.name ?? 'EMPLOYEE'
                    return (
                    <EmployeeRow
                      key={emp.id}
                      id={emp.id}
                      employeeCode={emp.employeeCode}
                      firstName={emp.firstName}
                      lastName={emp.lastName}
                      email={emp.user?.email ?? ''}
                      avatarUrl={emp.user?.avatarUrl ?? null}
                      position={emp.positionRef?.name ?? null}
                      isAdmin={roleName === 'ADMIN' || roleName === 'HR'}
                      isManager={roleName === 'MANAGER'}
                      isActive={emp.isActive}
                      isProbation={emp.isProbation}
                      departmentName={emp.department?.name ?? null}
                    />
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              ???? {skip + 1}{Math.min(skip + PAGE_SIZE, total)} ??? {total} ??????
            </p>
            <div className="flex items-center gap-1.5">
              <Link
                href={pageUrl(currentPage - 1)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                  currentPage <= 1
                    ? 'pointer-events-none border-border text-muted-foreground/30'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
                aria-disabled={currentPage <= 1}
              >
                 ????????
              </Link>

              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const half = 3
                let start = Math.max(1, currentPage - half)
                const end = Math.min(totalPages, start + 6)
                start = Math.max(1, end - 6)
                const p = start + i
                if (p > totalPages) return null
                return (
                  <Link
                    key={p}
                    href={pageUrl(p)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                      p === currentPage
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {p}
                  </Link>
                )
              })}

              <Link
                href={pageUrl(currentPage + 1)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                  currentPage >= totalPages
                    ? 'pointer-events-none border-border text-muted-foreground/30'
                    : 'border-border text-muted-foreground hover:bg-muted'
                }`}
                aria-disabled={currentPage >= totalPages}
              >
                ????? 
              </Link>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
