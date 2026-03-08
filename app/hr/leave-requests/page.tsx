import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { LeaveStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { HRActionButtons } from './HRActionButtons'
import AdminLayout from '@/components/admin-layout'

const STATUS_LABELS: Record<string, string> = {
  ALL: 'ทั้งหมด',
  PENDING:   'รออนุมัติ',
  IN_REVIEW: 'รอ HR',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  IN_REVIEW: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

const STATUS_BADGE_NEW: Record<string, string> = {
  PENDING:   'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/50',
  IN_REVIEW: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/50',
  APPROVED:  'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/50',
  REJECTED:  'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/50',
}

const STATUS_DOT: Record<string, string> = {
  PENDING:   'bg-amber-500',
  IN_REVIEW: 'bg-blue-500',
  APPROVED:  'bg-emerald-500',
  REJECTED:  'bg-red-500',
}

import { formatDate } from '@/lib/format-date'

export default async function HRLeaveRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const session = await auth()

  if (!session || !session.user.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500 text-lg font-semibold">Unauthorized</p>
      </div>
    )
  }

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

  const activeStatus = (status ?? 'IN_REVIEW').toUpperCase()

  const whereStatus =
    activeStatus !== 'ALL' && Object.keys(LeaveStatus).includes(activeStatus)
      ? (activeStatus as LeaveStatus)
      : undefined

  const requests = await prisma.leaveRequest.findMany({
    where: whereStatus ? { status: whereStatus } : undefined,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { name: true } },
    },
  })

  const tabs = ['ALL', 'PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED'] as const

  return (
    <AdminLayout title="HR — Leave Requests" user={user}>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">HR — ประวัติคำขอลาทั้งหมด</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              แสดง {requests.length} รายการ
              {activeStatus !== 'ALL' ? ` · กรอง: ${STATUS_LABELS[activeStatus]}` : ''}
            </p>
          </div>
          <a
            href="/api/export/leave"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Export CSV
          </a>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => {
            const isActive = activeStatus === tab
            return (
              <Link
                key={tab}
                href={tab === 'IN_REVIEW' ? '/hr/leave-requests' : `/hr/leave-requests?status=${tab}`}
                className={`px-4 py-2 text-sm font-medium rounded-t-md border-b-2 -mb-px transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                }`}
              >
                {STATUS_LABELS[tab]}
              </Link>
            )
          })}
        </div>

        {/* Table */}
        {requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
            <p className="text-muted-foreground">ไม่พบรายการ</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ชื่อพนักงาน</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">แผนก</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ประเภทการลา</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่เริ่ม</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">วันที่สิ้นสุด</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">จำนวนวัน</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">ช่วงเวลา</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">สถานะ</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {requests.map((req, index) => (
                    <tr key={req.id} className="hover:bg-primary/3 dark:hover:bg-primary/10 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{req.user.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {req.user.department?.name ?? (
                          <span className="italic text-muted-foreground/50">ไม่ระบุ</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{req.leaveType.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(req.startDate)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(req.endDate)}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{req.totalDays}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {req.startDurationType === req.endDurationType
                          ? (req.startDurationType === 'FULL_DAY' ? 'เต็มวัน' : req.startDurationType === 'HALF_DAY_MORNING' ? 'ครึ่งวันเช้า' : 'ครึ่งวันบ่าย')
                          : `เริ่ม: ${req.startDurationType === 'HALF_DAY_MORNING' ? 'เช้า' : req.startDurationType === 'HALF_DAY_AFTERNOON' ? 'บ่าย' : 'เต็มวัน'} / สิ้นสุด: ${req.endDurationType === 'HALF_DAY_MORNING' ? 'เช้า' : req.endDurationType === 'HALF_DAY_AFTERNOON' ? 'บ่าย' : 'เต็มวัน'}`
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_BADGE_NEW[req.status] ?? 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/40 dark:text-gray-400 dark:border-gray-700'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[req.status] ?? 'bg-gray-400'}`} />
                          {STATUS_LABELS[req.status] ?? req.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {req.status === 'IN_REVIEW' ? (
                          <HRActionButtons id={req.id} />
                        ) : (
                          <span className="text-muted-foreground/30">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
