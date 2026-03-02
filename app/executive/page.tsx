import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

function formatNumber(n: number) {
  return n.toLocaleString('th-TH')
}

export default async function ExecutiveDashboardPage() {
  const session = await auth()

  if (!session || (session.user.role !== 'EXECUTIVE' && session.user.role !== 'ADMIN')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-lg font-semibold">Unauthorized</p>
      </div>
    )
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  const monthFilter = {
    status: 'APPROVED' as const,
    startDate: { gte: monthStart, lte: monthEnd },
  }

  // 1. Total approved leave days & requests this month
  const [totalDaysAgg, totalRequests] = await Promise.all([
    prisma.leaveRequest.aggregate({
      where: monthFilter,
      _sum: { totalDays: true },
      _count: { _all: true },
    }),
    prisma.leaveRequest.count({ where: monthFilter }),
  ])

  const totalDays = totalDaysAgg._sum.totalDays ?? 0

  // 2. Leave days by leaveType this month
  const byLeaveTypeRaw = await prisma.leaveRequest.groupBy({
    by: ['leaveTypeId'],
    where: monthFilter,
    _sum: { totalDays: true },
    _count: { _all: true },
    orderBy: { _sum: { totalDays: 'desc' } },
  })

  const leaveTypeIds = byLeaveTypeRaw.map((r) => r.leaveTypeId)
  const leaveTypes = await prisma.leaveType.findMany({
    where: { id: { in: leaveTypeIds } },
    select: { id: true, name: true },
  })
  const ltMap = Object.fromEntries(leaveTypes.map((lt) => [lt.id, lt.name]))

  const byLeaveType = byLeaveTypeRaw.map((r) => ({
    name: ltMap[r.leaveTypeId] ?? r.leaveTypeId,
    days: r._sum.totalDays ?? 0,
    count: r._count._all,
  }))

  // 3. Leave days by department this month (aggregate in JS — Prisma groupBy doesn't traverse relations)
  const approvedThisMonth = await prisma.leaveRequest.findMany({
    where: monthFilter,
    select: {
      totalDays: true,
      user: {
        select: {
          department: { select: { name: true } },
        },
      },
    },
  })

  const deptMap: Record<string, number> = {}
  for (const req of approvedThisMonth) {
    const dept = req.user.department?.name ?? 'ไม่ระบุแผนก'
    deptMap[dept] = (deptMap[dept] ?? 0) + req.totalDays
  }
  const byDepartment = Object.entries(deptMap)
    .map(([name, days]) => ({ name, days }))
    .sort((a, b) => b.days - a.days)

  const topDept = byDepartment[0] ?? null

  const monthLabel = now.toLocaleDateString('th-TH', { year: 'numeric', month: 'long' })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Executive Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">ข้อมูลสรุปการลา · {monthLabel}</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-10">
        <StatCard
          icon="📊"
          label="วันลาทั้งหมด (เดือนนี้)"
          value={`${formatNumber(totalDays)} วัน`}
          color="bg-blue-50 text-blue-700"
        />
        <StatCard
          icon="👥"
          label="คำขอที่อนุมัติ (เดือนนี้)"
          value={`${formatNumber(totalRequests)} รายการ`}
          color="bg-green-50 text-green-700"
        />
        <StatCard
          icon="🏢"
          label="แผนกที่ลาเยอะสุด"
          value={topDept ? `${topDept.name} (${topDept.days} วัน)` : '—'}
          color="bg-orange-50 text-orange-700"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* By LeaveType */}
        <Section title="📈 วันลาแยกตามประเภท">
          {byLeaveType.length === 0 ? (
            <Empty />
          ) : (
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">ประเภทการลา</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">จำนวนวัน</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">คำขอ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {byLeaveType.map((row) => (
                  <tr key={row.name} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-800">{row.name}</td>
                    <td className="px-4 py-2 text-right font-semibold text-blue-700">{formatNumber(row.days)}</td>
                    <td className="px-4 py-2 text-right text-gray-500">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* By Department */}
        <Section title="🏢 วันลาแยกตามแผนก">
          {byDepartment.length === 0 ? (
            <Empty />
          ) : (
            <table className="min-w-full text-sm divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-600">แผนก</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">จำนวนวัน</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-600">สัดส่วน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {byDepartment.map((row) => {
                  const pct = totalDays > 0 ? ((row.days / totalDays) * 100).toFixed(1) : '0.0'
                  return (
                    <tr key={row.name} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-800">{row.name}</td>
                      <td className="px-4 py-2 text-right font-semibold text-orange-700">{formatNumber(row.days)}</td>
                      <td className="px-4 py-2 text-right text-gray-500">{pct}%</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string
  label: string
  value: string
  color: string
}) {
  return (
    <div className={`rounded-xl p-5 ${color} border border-opacity-20`}>
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function Empty() {
  return <p className="px-5 py-8 text-center text-gray-400 text-sm">ไม่มีข้อมูลเดือนนี้</p>
}
