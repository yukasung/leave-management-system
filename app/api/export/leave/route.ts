import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { LeaveStatus } from '@prisma/client'
import { durationLabel, type LeaveDurationType } from '@/lib/leave-calc'

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('th-TH', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'ร่าง',
  PENDING: 'รอ Manager',
  IN_REVIEW: 'รอ HR',
  APPROVED: 'อนุมัติแล้ว',
  REJECTED: 'ปฏิเสธ',
  CANCELLED: 'ยกเลิกแล้ว',
}

export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session || (session.user.role !== 'HR' && session.user.role !== 'ADMIN')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const statusParam = searchParams.get('status')?.toUpperCase()
  const yearParam = searchParams.get('year')

  const statusFilter =
    statusParam && Object.keys(LeaveStatus).includes(statusParam)
      ? (statusParam as LeaveStatus)
      : undefined

  const yearFilter = yearParam ? parseInt(yearParam, 10) : undefined

  const requests = await prisma.leaveRequest.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(yearFilter
        ? {
            startDate: {
              gte: new Date(`${yearFilter}-01-01`),
              lte: new Date(`${yearFilter}-12-31`),
            },
          }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: {
          name: true,
          email: true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { name: true } },
    },
  })

  const headers = [
    '#',
    'ชื่อพนักงาน',
    'Email',
    'แผนก',
    'ประเภทการลา',
    'วันที่เริ่ม',
    'วันที่สิ้นสุด',
    'จำนวนวัน',
    'ช่วงเวลาวันแรก',
    'ช่วงเวลาวันสุดท้าย',
    'สถานะ',
    'เหตุผล',
    'วันที่ส่งคำขอ',
  ]

  const rows = requests.map((req, index) => [
    index + 1,
    req.user.name,
    req.user.email,
    req.user.department?.name ?? '',
    req.leaveType.name,
    formatDate(req.startDate),
    formatDate(req.endDate),
    req.totalDays,
    durationLabel(req.startDurationType as LeaveDurationType),
    durationLabel(req.endDurationType as LeaveDurationType),
    STATUS_LABELS[req.status] ?? req.status,
    req.reason ?? '',
    formatDate(req.createdAt),
  ])

  const csvLines = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ]

  const bom = '\uFEFF' // UTF-8 BOM for Excel compatibility
  const csv = bom + csvLines.join('\r\n')

  const filename = `leave-requests${yearFilter ? `-${yearFilter}` : ''}${statusFilter ? `-${statusFilter}` : ''}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
