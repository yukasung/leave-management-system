import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { LeaveStatus } from '@prisma/client'
import { buildExcelReport, reportFilename, xlsxResponse, type ColumnDef } from '@/lib/excel-builder'
import { formatThaiDateShort } from '@/lib/date-utils'

const STATUS_LABELS: Record<string, string> = {
  DRAFT:            'ร่าง',
  PENDING:          'รออนุมัติ',
  IN_REVIEW:        'รอ HR',
  APPROVED:         'อนุมัติแล้ว',
  REJECTED:         'ปฏิเสธ',
  CANCELLED:        'ยกเลิกแล้ว',
  CANCEL_REQUESTED: 'ขอยกเลิก',
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const employee     = searchParams.get('employee')     ?? undefined
  const dateFrom     = searchParams.get('dateFrom')     ?? undefined
  const dateTo       = searchParams.get('dateTo')       ?? undefined
  const leaveTypeId  = searchParams.get('leaveTypeId')  ?? undefined
  const leaveCategory = searchParams.get('leaveCategory') ?? undefined
  const statusParam  = searchParams.get('status')?.toUpperCase() ?? undefined
  const departmentId = searchParams.get('departmentId') ?? undefined
  const sortParam    = searchParams.get('sort') ?? 'startDate'
  const dirParam     = searchParams.get('dir') === 'asc' ? 'asc' : 'desc'

  const VALID_STATUSES = Object.keys(LeaveStatus)
  const statusFilter = statusParam && VALID_STATUSES.includes(statusParam)
    ? (statusParam as LeaveStatus)
    : undefined

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(leaveTypeId  ? { leaveTypeId } : {}),
    ...(leaveCategory ? { leaveType: { leaveCategory: { key: leaveCategory } } } : {}),
    ...(dateFrom || dateTo
      ? {
          leaveStartDateTime: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo   ? { lte: new Date(dateTo + 'T23:59:59.999Z') } : {}),
          },
        }
      : {}),
    user: {
      ...(employee     ? { name: { contains: employee, mode: 'insensitive' as const } } : {}),
      ...(departmentId ? { employee: { departmentId } } : {}),
    },
  }

  const SORT_MAP: Record<string, object> = {
    name:       { user: { name: dirParam } },
    startDate:  { leaveStartDateTime: dirParam },
    endDate:    { leaveEndDateTime: dirParam },
    totalDays:  { totalDays: dirParam },
    status:     { status: dirParam },
    leaveType:  { leaveType: { name: dirParam } },
    department: { user: { employee: { department: { name: dirParam } } } },
    createdAt:  { createdAt: dirParam },
  }
  const orderBy = SORT_MAP[sortParam] ?? SORT_MAP['startDate']

  const requests = await prisma.leaveRequest.findMany({
    where,
    orderBy,
    include: {
      user: {
        select: {
          name:       true,
          employee:   { select: { employeeCode: true, department: { select: { name: true } } } },
        },
      },
      leaveType: { select: { name: true, leaveCategory: { select: { name: true } } } },
      approvals: {
        orderBy: { level: 'desc' },
        take:    1,
        include: { approver: { select: { name: true } } },
      },
    },
  })

  const columns: ColumnDef[] = [
    { header: '#',           type: 'index',  width: 6  },
    { header: 'ชื่อพนักงาน',    type: 'text',   width: 25 },
    { header: 'รหัสพนักงาน',    type: 'text',   width: 16 },
    { header: 'แผนก',          type: 'text',   width: 20 },
    { header: 'หมวดหมู่การลา',  type: 'text',   width: 16 },
    { header: 'ประเภทการลา',    type: 'text',   width: 18 },
    { header: 'วันที่เริ่ม',      type: 'date',   width: 15 },
    { header: 'วันที่สิ้นสุด',    type: 'date',   width: 15 },
    { header: 'จำนวนวัน',      type: 'number', width: 12 },
    { header: 'เหตุผล',         type: 'text',   width: 30 },
    { header: 'สถานะ',         type: 'status', width: 15 },
    { header: 'ผู้อนุมัติ',      type: 'text',   width: 22 },
    { header: 'วันที่ยื่น',      type: 'date',   width: 15 },
  ]

  const dataRows = requests.map((r, i) => [
    i + 1,
    r.user.name,
    r.user.employee?.employeeCode ?? '',
    r.user.employee?.department?.name ?? '',
    r.leaveType.leaveCategory?.name ?? '',
    r.leaveType.name,
    formatThaiDateShort(r.leaveStartDateTime),
    formatThaiDateShort(r.leaveEndDateTime),
    parseFloat(r.totalDays.toFixed(2)),
    r.reason ?? '',
    STATUS_LABELS[r.status] ?? r.status,
    r.approvals[0]?.approver.name ?? '',
    formatThaiDateShort(r.createdAt),
  ] as (string | number | null)[])

  const filename = reportFilename('Employee_History')
  const buf = buildExcelReport(columns, dataRows, {
    title:       'ประวัติการลาพนักงาน',
    sheetName:   'Employee Leave History',
    fileName:    filename,
    generatedBy: session.user.name ?? undefined,
    dateFrom,
    dateTo,
  })

  return xlsxResponse(buf, filename)
}
