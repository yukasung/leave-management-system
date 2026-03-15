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
  const dateFrom    = searchParams.get('dateFrom')    ?? undefined
  const dateTo      = searchParams.get('dateTo')      ?? undefined
  const leaveTypeId = searchParams.get('leaveTypeId') ?? undefined

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

  const [allDepts, requests] = await Promise.all([
    prisma.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { employees: true } } },
    }),
    prisma.leaveRequest.findMany({
      where,
      select: { totalDays: true, user: { select: { departmentId: true } } },
    }),
  ])

  type Row = { id: string; name: string; empCount: number; requests: number; days: number }
  const map = new Map<string, Row>()
  for (const d of allDepts) {
    map.set(d.id, { id: d.id, name: d.name, empCount: d._count.employees, requests: 0, days: 0 })
  }
  map.set('__none__', { id: '__none__', name: 'ไม่ระบุแผนก', empCount: 0, requests: 0, days: 0 })

  for (const r of requests) {
    const key = r.user.departmentId ?? '__none__'
    const row = map.get(key)
    if (row) { row.requests++; row.days += r.totalDays }
  }

  const rows = Array.from(map.values())
    .filter((r) => r.id === '__none__' ? r.requests > 0 : true)
    .sort((a, b) => b.days - a.days)

  const columns: ColumnDef[] = [
    { header: '#',                      type: 'index',  width: 6  },
    { header: 'แผนก',                    type: 'text',   width: 26 },
    { header: 'จำนวนพนักงาน',          type: 'number', width: 16 },
    { header: 'คำขอลา',               type: 'number', width: 12 },
    { header: 'วันลารวม',             type: 'number', width: 14 },
    { header: 'เฉลี่ยต่อพนักงาน (วัน)', type: 'number', width: 22 },
  ]

  const totalDays     = rows.reduce((s, r) => s + r.days, 0)
  const totalRequests = rows.reduce((s, r) => s + r.requests, 0)

  const dataRows = rows.map((r, i) => [
    i + 1,
    r.name,
    r.empCount,
    r.requests,
    parseFloat(r.days.toFixed(2)),
    r.empCount > 0 ? parseFloat((r.days / r.empCount).toFixed(2)) : 0,
  ] as (string | number | null)[])

  const summaryRow: (string | number | null)[] = [
    null, 'รวม', null,
    totalRequests,
    parseFloat(totalDays.toFixed(2)),
    null,
  ]

  const filename = reportFilename('Department_Leave')
  const buf = buildExcelReport(columns, dataRows, {
    title:       'รายงานการลาตามแผนก',
    sheetName:   'Department Leave Report',
    fileName:    filename,
    generatedBy: session.user.name ?? undefined,
    dateFrom,
    dateTo,
  }, summaryRow)

  return xlsxResponse(buf, filename)
}
