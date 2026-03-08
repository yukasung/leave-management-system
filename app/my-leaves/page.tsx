import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { durationLabel, type LeaveDurationType } from '@/lib/leave-calc'
import { formatDate } from '@/lib/format-date'
import LeaveActionsCell from './LeaveActionsCell'
import AdminLayout from '@/components/admin-layout'

const STATUS_BADGE: Record<string, string> = {
  DRAFT:            'bg-muted text-muted-foreground border-border',
  PENDING:          'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  IN_REVIEW:        'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
  APPROVED:         'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED:         'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
  CANCELLED:        'bg-muted text-muted-foreground border-border',
  CANCEL_REQUESTED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 dark:border-orange-800/50',
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT:            'ร่าง',
  PENDING:          'รออนุมัติ',
  IN_REVIEW:        'กำลังพิจารณา',
  APPROVED:         'อนุมัติแล้ว',
  REJECTED:         'ไม่อนุมัติ',
  CANCELLED:        'ยกเลิกแล้ว',
  CANCEL_REQUESTED: 'ขอยกเลิก (รอ HR)',
}

export default async function MyLeaveHistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const [requests, dbUser] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: { leaveType: { select: { name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
  }

  return (
    <AdminLayout title="ประวัติการลา" user={user}>
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">ประวัติการลาของฉัน</h2>
          <p className="text-sm text-muted-foreground mt-0.5">ทั้งหมด {requests.length} รายการ</p>
        </div>

        {requests.length === 0 ? (
          <div className="rounded-xl border border-border bg-card shadow-sm py-20 text-center text-muted-foreground">
            ยังไม่มีประวัติการลา
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ประเภทการลา</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่เริ่มต้น</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่สิ้นสุด</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">จำนวน</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ช่วงเวลา</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">เหตุผล</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">สถานะ</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่ส่ง</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req) => {
                    const badgeCls = STATUS_BADGE[req.status] ?? STATUS_BADGE.CANCELLED
                    const label   = STATUS_LABEL[req.status] ?? req.status
                    return (
                      <tr key={req.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition">
                        <td className="px-5 py-4 font-medium text-foreground">
                          {req.leaveType.name}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(req.startDate)}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(req.endDate)}
                        </td>
                        <td className="px-5 py-4 text-center font-semibold text-foreground">
                          {req.totalDays} วัน
                        </td>
                        <td className="px-5 py-4 text-muted-foreground text-xs">
                          {req.startDurationType === req.endDurationType
                            ? durationLabel(req.startDurationType as LeaveDurationType)
                            : `เริ่ม: ${durationLabel(req.startDurationType as LeaveDurationType)} / สิ้นสุด: ${durationLabel(req.endDurationType as LeaveDurationType)}`}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground max-w-xs truncate">
                          {req.reason || <span className="text-muted-foreground/40">—</span>}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${badgeCls}`}>
                            {label}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(req.createdAt)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <LeaveActionsCell leaveId={req.id} status={req.status} />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default async function MyLeaveHistoryPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      leaveType: { select: { name: true } },
    },
  })

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">ประวัติการลาของฉัน</h1>
        <p className="text-sm text-gray-500 mt-1">ทั้งหมด {requests.length} รายการ</p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center text-gray-500 py-16 bg-white rounded-2xl shadow-sm">
          ยังไม่มีประวัติการลา
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl shadow-sm">
          <table className="w-full bg-white text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-left text-gray-600 font-semibold">
                <th className="px-5 py-3">ประเภทการลา</th>
                <th className="px-5 py-3">วันที่เริ่มต้น</th>
                <th className="px-5 py-3">วันที่สิ้นสุด</th>
                <th className="px-5 py-3 text-center">จำนวน</th>
                <th className="px-5 py-3">ช่วงเวลา</th>
                <th className="px-5 py-3">เหตุผล</th>
                <th className="px-5 py-3 text-center">สถานะ</th>
                <th className="px-5 py-3">วันที่ส่งคำขอ</th>
                <th className="px-5 py-3 text-center">การดำเนินการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => {
                const status = statusLabel[req.status] ?? { label: req.status, className: 'bg-gray-100 text-gray-600' }
                return (
                  <tr key={req.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {req.leaveType.name}
                    </td>
                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                      {formatDate(req.startDate)}
                    </td>
                    <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                      {formatDate(req.endDate)}
                    </td>
                    <td className="px-5 py-4 text-center font-semibold text-gray-900">
                      {req.totalDays} วัน
                    </td>
                    <td className="px-5 py-4 text-gray-600 text-xs">
                      {req.startDurationType === req.endDurationType
                        ? durationLabel(req.startDurationType as LeaveDurationType)
                        : `เริ่ม: ${durationLabel(req.startDurationType as LeaveDurationType)} / สิ้นสุด: ${durationLabel(req.endDurationType as LeaveDurationType)}`
                      }
                    </td>
                    <td className="px-5 py-4 text-gray-600 max-w-xs truncate">
                      {req.reason || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                      {formatDate(req.createdAt)}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <LeaveActionsCell leaveId={req.id} status={req.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
