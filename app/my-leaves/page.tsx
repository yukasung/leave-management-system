import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { formatLeaveDuration } from '@/lib/leave-calc'
import { formatDate } from '@/lib/format-date'
import LeaveActionsCell from './LeaveActionsCell'
import AdminLayout from '@/components/admin-layout'
import Link from 'next/link'

const PAGE_SIZE = 14

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

export default async function MyLeaveHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { page: pageStr } = (await searchParams) ?? {}
  const page = Math.max(1, parseInt(pageStr ?? '1', 10) || 1)

  const [total, requests, dbUser] = await Promise.all([
    prisma.leaveRequest.count({ where: { userId: session.user.id } }),
    prisma.leaveRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { leaveType: { select: { name: true } } },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const user = {
    name:      session.user.name ?? '',
    email:     session.user.email ?? '',
    avatarUrl: dbUser?.avatarUrl ?? null,
    isAdmin:   session.user.isAdmin,
  }

  return (
    <AdminLayout title="การลาของฉัน" user={user}>
      <div className="space-y-4 max-w-6xl mx-auto">
        {/* Header */}
        <div>
          <h2 className="text-lg font-semibold text-foreground">ประวัติการลาของฉัน</h2>
          <p className="text-sm text-muted-foreground mt-0.5">ทั้งหมด {total} รายการ</p>
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
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่เริ่มลา</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่สิ้นสุด</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">จำนวน</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">เหตุผล</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">สถานะ</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่ขอ</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground">จัดการ</th>
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
                          {formatDate(req.leaveStartDateTime)}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground whitespace-nowrap">
                          {formatDate(req.leaveEndDateTime)}
                        </td>
                        <td className="px-5 py-4 text-center font-semibold text-foreground">
                          {formatLeaveDuration(req.totalDays)}
                        </td>
                        <td className="px-5 py-4 text-muted-foreground max-w-xs truncate">
                          {req.reason || <span className="text-muted-foreground/40"></span>}
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 pt-2">
            <Link
              href={`?page=${page - 1}`}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                page <= 1
                  ? 'pointer-events-none opacity-40 border-border text-muted-foreground'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              ← ก่อนหน้า
            </Link>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={`?page=${p}`}
                className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm border transition ${
                  p === page
                    ? 'bg-primary text-primary-foreground border-primary font-semibold'
                    : 'border-border text-foreground hover:bg-muted'
                }`}
              >
                {p}
              </Link>
            ))}

            <Link
              href={`?page=${page + 1}`}
              className={`px-3 py-1.5 rounded-lg text-sm border transition ${
                page >= totalPages
                  ? 'pointer-events-none opacity-40 border-border text-muted-foreground'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              ถัดไป →
            </Link>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}