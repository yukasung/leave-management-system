'use server'

import { prisma } from '@/lib/prisma'
import { auth }   from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type ResetResult = {
  success:  boolean
  message:  string
  created?: number
  skipped?: number
}

export async function resetLeaveYear(year: number): Promise<ResetResult> {
  const session = await auth()
  if (!session?.user?.isAdmin) {
    return { success: false, message: 'ไม่มีสิทธิ์เข้าถึง' }
  }

  if (!year || year < 2000 || year > 2100) {
    return { success: false, message: 'ปีไม่ถูกต้อง' }
  }

  // Fetch all users that have a linked employee (active accounts)
  const users = await prisma.user.findMany({
    where: { employee: { isNot: null } },
    select: { id: true },
  })

  // Fetch all leave types that have a maxDaysPerYear quota
  const leaveTypes = await prisma.leaveType.findMany({
    where: { maxDaysPerYear: { not: null } },
    select: { id: true, maxDaysPerYear: true },
  })

  if (users.length === 0) {
    return { success: false, message: 'ไม่พบข้อมูลพนักงาน' }
  }
  if (leaveTypes.length === 0) {
    return { success: false, message: 'ไม่พบประเภทการลาที่มีโควตา' }
  }

  const data = users.flatMap((u) =>
    leaveTypes.map((lt) => ({
      userId:     u.id,
      leaveTypeId: lt.id,
      year,
      totalDays:  lt.maxDaysPerYear!,
      usedDays:   0,
    }))
  )

  const result = await prisma.leaveBalance.createMany({
    data,
    skipDuplicates: true,
  })

  revalidatePath('/hr/leave-balance-report')
  revalidatePath('/hr/leave-year-reset')

  return {
    success: true,
    message: result.count > 0
      ? `สร้างยอดวันลา พ.ศ. ${year + 543} สำเร็จ ${result.count} รายการ`
      : `พ.ศ. ${year + 543} มีข้อมูลครบถ้วนแล้ว ไม่มีรายการใหม่`,
    created: result.count,
  }
}

export async function getYearSummary() {
  const session = await auth()
  if (!session?.user?.isAdmin) return []

  const rows = await prisma.leaveBalance.groupBy({
    by:      ['year'],
    _count:  { id: true },
    orderBy: { year: 'desc' },
  })

  return rows.map((r) => ({ year: r.year, count: r._count.id }))
}
