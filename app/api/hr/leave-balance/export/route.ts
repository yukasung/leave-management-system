import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { buildExcelReport, reportFilename, xlsxResponse, type ColumnDef } from '@/lib/excel-builder'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const employee     = searchParams.get('employee')     ?? undefined
  const departmentId = searchParams.get('departmentId') ?? undefined
  const leaveTypeId  = searchParams.get('leaveTypeId')  ?? undefined
  const leaveCategory = searchParams.get('leaveCategory') ?? undefined
  const yearParam    = searchParams.get('year')
  const year         = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear()

  const where = {
    year,
    ...(leaveTypeId   ? { leaveTypeId } : {}),
    ...(leaveCategory ? { leaveType: { leaveCategory: { key: leaveCategory } } } : {}),
    user: {
      ...(employee     ? { name: { contains: employee, mode: 'insensitive' as const } } : {}),
      ...(departmentId ? { employee: { departmentId } } : {}),
    },
  }

  const balances = await prisma.leaveBalance.findMany({
    where,
    orderBy: [{ user: { name: 'asc' } }, { leaveType: { name: 'asc' } }],
    include: {
      user: {
        select: {
          name:       true,
          employee:   { select: { employeeCode: true, department: { select: { name: true } } } },
        },
      },
      leaveType: { select: { name: true, leaveCategory: { select: { name: true } } } },
    },
  })

  const columns: ColumnDef[] = [
    { header: '#',             type: 'index',  width: 6  },
    { header: 'ชื่อพนักงาน',    type: 'text',   width: 25 },
    { header: 'รหัสพนักงาน',    type: 'text',   width: 16 },
    { header: 'แผนก',          type: 'text',   width: 20 },
    { header: 'หมวดหมู่การลา',  type: 'text',   width: 16 },
    { header: 'ประเภทการลา',    type: 'text',   width: 18 },
    { header: 'วันลาที่ได้รับ',    type: 'number', width: 14 },
    { header: 'ใช้ไปแล้ว',       type: 'number', width: 12 },
    { header: 'คงเหลือ',        type: 'number', width: 12 },
    { header: 'สถานะ',         type: 'status', width: 14 },
  ]

  const dataRows = balances.map((b, i) => {
    const remaining   = parseFloat((b.totalDays - b.usedDays).toFixed(2))
    const pct         = b.totalDays > 0 ? (b.usedDays / b.totalDays) * 100 : 0
    const statusLabel = remaining <= 0 ? 'หมดแล้ว' : pct >= 75 ? 'เหลือน้อย' : 'ปกติ'
    return [
      i + 1,
      b.user.name,
      b.user.employee?.employeeCode ?? '',
      b.user.employee?.department?.name ?? '',
      b.leaveType.leaveCategory?.name ?? '',
      b.leaveType.name,
      parseFloat(b.totalDays.toFixed(2)),
      parseFloat(b.usedDays.toFixed(2)),
      remaining,
      statusLabel,
    ] as (string | number | null)[]
  })

  const totalGranted  = parseFloat(balances.reduce((s, b) => s + b.totalDays, 0).toFixed(2))
  const totalUsed     = parseFloat(balances.reduce((s, b) => s + b.usedDays, 0).toFixed(2))
  const totalRemain   = parseFloat((totalGranted - totalUsed).toFixed(2))
  const summaryRow: (string | number | null)[] = [
    null, 'รวม', null, null, null, null,
    totalGranted, totalUsed, totalRemain, null,
  ]

  const filename = reportFilename('Leave_Balance')
  const buf = buildExcelReport(columns, dataRows, {
    title:       `ยอดวันลาคงเหลือ ปี ${year + 543}`,
    sheetName:   'Leave Balance',
    fileName:    filename,
    generatedBy: session.user.name ?? undefined,
  }, summaryRow)

  return xlsxResponse(buf, filename)
}
