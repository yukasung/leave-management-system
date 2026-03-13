import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { LeaveStatus } from '@prisma/client'
import { buildExcelReport, reportFilename, xlsxResponse, type ColumnDef } from '@/lib/excel-builder'
import { formatThaiDateShort } from '@/lib/date-utils'

const PENDING_STATUSES: LeaveStatus[] = ['PENDING', 'IN_REVIEW', 'CANCEL_REQUESTED']

const STATUS_LABELS: Record<string, string> = {
  PENDING:          'รออนุมัติ',
  IN_REVIEW:        'รอ HR',
  CANCEL_REQUESTED: 'ขอยกเลิก',
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const approverId   = searchParams.get('approverId')   ?? undefined
  const departmentId = searchParams.get('departmentId') ?? undefined
  const dateFrom     = searchParams.get('dateFrom')     ?? undefined
  const dateTo       = searchParams.get('dateTo')       ?? undefined
  const sortDir      = searchParams.get('dir') === 'asc' ? 'asc' : ('desc' as const)

  const where = {
    status: { in: PENDING_STATUSES },
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
    ...(departmentId ? { user: { departmentId } } : {}),
    ...(approverId
      ? { approvals: { some: { approverId, status: 'PENDING' as const } } }
      : {}),
  }

  const requests = await prisma.leaveRequest.findMany({
    where,
    orderBy: { createdAt: sortDir },
    include: {
      user: {
        select: {
          name:       true,
          department: { select: { name: true } },
        },
      },
      leaveType: { select: { name: true } },
      approvals: {
        where:   { status: 'PENDING' },
        orderBy: { level: 'asc' },
        take:    1,
        include: { approver: { select: { name: true } } },
      },
    },
  })

  const now = new Date()

  const columns: ColumnDef[] = [
    { header: '#',              type: 'index',  width: 6  },
    { header: 'ชื่อพนักงาน',  type: 'text',   width: 25 },
    { header: 'แผนก',          type: 'text',   width: 20 },
    { header: 'ประเภทการลา',  type: 'text',   width: 18 },
    { header: 'วันที่เริ่ม',    type: 'date',   width: 15 },
    { header: 'วันที่สิ้นสุด',  type: 'date',   width: 15 },
    { header: 'จำนวนวัน',    type: 'number', width: 12 },
    { header: 'วันที่ยื่น',    type: 'date',   width: 15 },
    { header: 'รอมา (วัน)',   type: 'number', width: 12 },
    { header: 'ผู้อนุมัติ',    type: 'text',   width: 22 },
    { header: 'สถานะ',       type: 'status', width: 15 },
  ]

  const dataRows = requests.map((r, i) => [
    i + 1,
    r.user.name,
    r.user.department?.name ?? '',
    r.leaveType.name,
    formatThaiDateShort(r.leaveStartDateTime),
    formatThaiDateShort(r.leaveEndDateTime),
    parseFloat(r.totalDays.toFixed(2)),
    formatThaiDateShort(r.createdAt),
    Math.floor((now.getTime() - r.createdAt.getTime()) / 86_400_000),
    r.approvals[0]?.approver.name ?? '',
    STATUS_LABELS[r.status] ?? r.status,
  ] as (string | number | null)[])

  const filename = reportFilename('Pending_Leave')
  const buf = buildExcelReport(columns, dataRows, {
    title:       'คำขอรออนุมัติ',
    sheetName:   'Pending Leave Requests',
    fileName:    filename,
    generatedBy: session.user.name ?? undefined,
    dateFrom,
    dateTo,
  })

  return xlsxResponse(buf, filename)
}
