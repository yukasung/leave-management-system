import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin-layout'
import DepartmentLeaveClient from './DepartmentLeaveClient'

type SearchParams = {
  dateFrom?:    string
  dateTo?:      string
  leaveTypeId?: string
}

export default async function DepartmentLeaveReportPage({
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

  const { dateFrom, dateTo, leaveTypeId } = await searchParams

  const where = {
    status: 'APPROVED' as const,
    ...(dateFrom || dateTo
      ? {
          leaveStartDateTime: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
    ...(leaveTypeId ? { leaveTypeId } : {}),
  }

  const [allDepts, requests, leaveTypes] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    }),
    prisma.leaveRequest.findMany({
      where,
      select: { totalDays: true, user: { select: { id: true, departmentId: true } } },
    }),
    prisma.leaveType.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
  ])

  // Aggregate by department
  type DeptRow = { id: string; name: string; empCount: number; requestCount: number; totalDays: number; uniqueEmployees: number }
  const map = new Map<string, DeptRow & { _empSet: Set<string> }>()

  for (const d of allDepts) {
    map.set(d.id, { id: d.id, name: d.name, empCount: d._count.users, requestCount: 0, totalDays: 0, uniqueEmployees: 0, _empSet: new Set() })
  }
  map.set('__none__', { id: '__none__', name: 'ไม่ระบุแผนก', empCount: 0, requestCount: 0, totalDays: 0, uniqueEmployees: 0, _empSet: new Set() })

  for (const r of requests) {
    const key = r.user.departmentId ?? '__none__'
    const row = map.get(key)
    if (row) {
      row.requestCount++
      row.totalDays += r.totalDays
      row._empSet.add(r.user.id)
    }
  }

  const byDepartment: DeptRow[] = Array.from(map.values())
    .map(({ _empSet, ...rest }) => ({ ...rest, uniqueEmployees: _empSet.size }))
    .filter((r) => r.id === '__none__' ? r.requestCount > 0 : true)
    .sort((a, b) => b.totalDays - a.totalDays)

  const totalRequests  = byDepartment.reduce((s, r) => s + r.requestCount, 0)
  const totalDays      = byDepartment.reduce((s, r) => s + r.totalDays, 0)
  const totalEmployees = allDepts.reduce((s, d) => s + d._count.users, 0)

  return (
    <AdminLayout title="รายงานการลาตามแผนก" user={user}>
      <DepartmentLeaveClient
        leaveTypes={leaveTypes}
        byDepartment={byDepartment}
        summary={{ totalRequests, totalDays, totalEmployees }}
        filters={{ dateFrom, dateTo, leaveTypeId }}
      />
    </AdminLayout>
  )
}
