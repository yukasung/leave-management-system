import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const isAdmin = session.user.isAdmin

  const [pending, approved, rejected, total, pendingAll] = await Promise.all([
    prisma.leaveRequest.count({ where: { userId, status: 'PENDING' } }),
    prisma.leaveRequest.count({ where: { userId, status: 'APPROVED' } }),
    prisma.leaveRequest.count({ where: { userId, status: 'REJECTED' } }),
    prisma.leaveRequest.count({ where: { userId } }),
    // สำหรับ admin — คำขอที่รออนุมัติทั้งหมด
    isAdmin
      ? prisma.leaveRequest.count({ where: { status: 'PENDING' } })
      : Promise.resolve(0),
  ])

  const recentRequests = await prisma.leaveRequest.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { leaveType: { select: { name: true } } },
  })

  const statusStyle: Record<string, string> = {
    PENDING:   'bg-yellow-100 text-yellow-700',
    IN_REVIEW: 'bg-blue-100 text-blue-700',
    APPROVED:  'bg-green-100 text-green-700',
    REJECTED:  'bg-red-100 text-red-600',
  }
  const statusLabel: Record<string, string> = {
    PENDING:   'รออนุมัติ',
    IN_REVIEW: 'กำลังพิจารณา',
    APPROVED:  'อนุมัติแล้ว',
    REJECTED:  'ไม่อนุมัติ',
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">
          สวัสดี, {session.user.name} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAdmin ? 'ผู้ดูแลระบบ' : 'พนักงาน'} · ระบบจัดการวันลา
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8 sm:grid-cols-4">
        <StatCard label="คำขอทั้งหมด" value={total} color="text-gray-700" bg="bg-white" />
        <StatCard label="รออนุมัติ" value={pending} color="text-yellow-600" bg="bg-yellow-50" />
        <StatCard label="อนุมัติแล้ว" value={approved} color="text-green-600" bg="bg-green-50" />
        <StatCard label="ไม่อนุมัติ" value={rejected} color="text-red-500" bg="bg-red-50" />
      </div>

      {/* Admin extra card */}
      {isAdmin && (
        <div className="mb-8 p-5 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600 font-medium">คำขอลาที่รอการอนุมัติ (ทั้งหมด)</p>
            <p className="text-3xl font-bold text-blue-700 mt-1">{pendingAll} รายการ</p>
          </div>
          <Link
            href="/hr/leave-requests"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            จัดการคำขอ →
          </Link>
        </div>
      )}

      {/* Quick Links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-8">
        <QuickLink href="/leave-request" title="ยื่นคำขอลา" desc="สร้างคำขอลาใหม่" icon="📝" />
        <QuickLink href="/my-leaves" title="ประวัติการลา" desc="ดูคำขอลาของฉันทั้งหมด" icon="📋" />
      </div>

      {/* Recent Requests */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-700">คำขอลาล่าสุด</h2>
          <Link href="/my-leaves" className="text-xs text-blue-600 hover:underline">
            ดูทั้งหมด
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">ยังไม่มีคำขอลา</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500 text-xs font-medium uppercase tracking-wide">
                <th className="px-5 py-3">ประเภท</th>
                <th className="px-5 py-3">วันที่</th>
                <th className="px-5 py-3 text-center">จำนวน</th>
                <th className="px-5 py-3 text-center">สถานะ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentRequests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-3 font-medium text-gray-900">{req.leaveType.name}</td>
                  <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                    {new Date(req.startDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })} — {new Date(req.endDate).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </td>
                  <td className="px-5 py-3 text-center text-gray-700">{req.totalDays} วัน</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusStyle[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {statusLabel[req.status] ?? req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label, value, color, bg,
}: {
  label: string
  value: number
  color: string
  bg: string
}) {
  return (
    <div className={`${bg} rounded-2xl shadow-sm p-5`}>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
    </div>
  )
}

function QuickLink({
  href, title, desc, icon,
}: {
  href: string
  title: string
  desc: string
  icon: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm hover:shadow-md transition"
    >
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </Link>
  )
}
