import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { Suspense } from 'react'
import EmployeeFilters from './EmployeeFilters'
import AdminLayout from '@/components/admin-layout'

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
    position:     [{ position: order }, { firstName: 'asc' as const }],
    isActive:     [{ isActive: order === 'asc' ? 'desc' as const : 'asc' as const }, { firstName: 'asc' as const }],
  }

  const where = {
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { employeeCode: { contains: search, mode: 'insensitive' as const } },
            { email: { contains: search, mode: 'insensitive' as const } },
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
        email: true,
        avatarUrl: true,
        position: true,
        isAdmin: true,
        isManager: true,
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
    if (sort !== col) return <span className="ml-1 opacity-30">↕</span>
    return <span className="ml-1">{order === 'asc' ? '↑' : '↓'}</span>
  }

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   true,
  }

  return (
    <AdminLayout title="จัดการพนักงาน" user={user}>
      <div className="space-y-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">จัดการพนักงาน</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              พนักงานทั้งหมด {total.toLocaleString()} คน
              {search || department ? ' · กรองอยู่' : ''}
            </p>
          </div>
          <Link
            href="/admin/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition"
          >
            + เพิ่มพนักงานใหม่
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
              <p className="text-lg">ไม่พบพนักงาน</p>
              {(search || department) && (
                <p className="text-sm mt-1">ลองเปลี่ยนคำค้นหาหรือตัวกรอง</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3.5 whitespace-nowrap">
                      <Link href={sortUrl('employeeCode')} className="inline-flex items-center hover:text-foreground transition-colors">
                        รหัสพนักงาน<SortIcon col="employeeCode" />
                      </Link>
                    </th>
                    <th className="px-5 py-3.5 whitespace-nowrap">
                      <Link href={sortUrl('firstName')} className="inline-flex items-center hover:text-foreground transition-colors">
                        ชื่อ-นามสกุล<SortIcon col="firstName" />
                      </Link>
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">
                      <Link href={sortUrl('department')} className="inline-flex items-center justify-center w-full hover:text-foreground transition-colors">
                        แผนก<SortIcon col="department" />
                      </Link>
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">
                      <Link href={sortUrl('position')} className="inline-flex items-center justify-center w-full hover:text-foreground transition-colors">
                        ตำแหน่ง<SortIcon col="position" />
                      </Link>
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">บทบาท</th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">
                      <Link href={sortUrl('isActive')} className="inline-flex items-center justify-center w-full hover:text-foreground transition-colors">
                        สถานะ<SortIcon col="isActive" />
                      </Link>
                    </th>
                    <th className="px-5 py-3.5 text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-muted-foreground text-xs whitespace-nowrap">
                        {emp.employeeCode}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full overflow-hidden shrink-0 ring-1 ring-border">
                            {emp.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={emp.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-primary/60 to-primary text-primary-foreground text-[10px] font-bold select-none">
                                {`${emp.firstName}${emp.lastName}`.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                            {emp.isProbation && (
                              <span className="inline-block mt-0.5 text-[10px] px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 font-medium">
                                ทดลองงาน
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center text-muted-foreground whitespace-nowrap">
                        {emp.department?.name ?? (
                          <span className="text-muted-foreground/40"></span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center text-muted-foreground whitespace-nowrap">{emp.position}</td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          {emp.isAdmin && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400 border border-violet-200 dark:border-violet-800/50">
                              ผู้ดูแลระบบ
                            </span>
                          )}
                          {emp.isManager && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/50">
                              ผู้อนุมัติการลา
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            emp.isActive
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50'
                              : 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              emp.isActive ? 'bg-emerald-500' : 'bg-red-400'
                            }`}
                          />
                          {emp.isActive ? 'ทำงานอยู่' : 'ไม่ทำงาน'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center whitespace-nowrap">
                        <Link
                          href={`/admin/employees/${emp.id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          แก้ไข
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              แสดง {skip + 1}{Math.min(skip + PAGE_SIZE, total)} จาก {total} รายการ
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
                 ก่อนหน้า
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
                ถัดไป 
              </Link>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}