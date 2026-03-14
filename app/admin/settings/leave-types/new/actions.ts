'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type LeaveTypeFormState = {
  success: boolean
  message: string
  errors?: { name?: string }
}

export async function createLeaveType(
  _prev: LeaveTypeFormState,
  formData: FormData,
): Promise<LeaveTypeFormState> {
  const session = await auth()
  if (!session || !session.user.isAdmin) {
    return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const maxDaysPerYear = formData.get('maxDaysPerYear')
  const maxDaysPerRequest = formData.get('maxDaysPerRequest')
  const requiresAttachment = formData.get('requiresAttachment') === 'true'
  const deductFromBalance = formData.get('deductFromBalance') === 'true'
  const allowDuringProbation = formData.get('allowDuringProbation') === 'true'
  const leaveCategory = (formData.get('leaveCategory') as string | null) ?? 'ANNUAL'
  const leaveLimitType = (formData.get('leaveLimitType') as string | null) ?? 'PER_YEAR'
  const dayCountType = (formData.get('dayCountType') as string | null) ?? 'WORKING_DAY'

  if (!name) {
    return { success: false, message: 'กรุณากรอกชื่อประเภทการลา', errors: { name: 'ชื่อจำเป็น' } }
  }

  const existing = await prisma.leaveType.findUnique({ where: { name } })
  if (existing) {
    return { success: false, message: 'ชื่อประเภทการลานี้มีอยู่แล้ว', errors: { name: 'ชื่อซ้ำ' } }
  }

  const leaveType = await prisma.leaveType.create({
    data: {
      name,
      maxDaysPerYear: maxDaysPerYear ? parseFloat(maxDaysPerYear as string) : null,
      maxDaysPerRequest: maxDaysPerRequest ? parseFloat(maxDaysPerRequest as string) : null,
      requiresAttachment,
      deductFromBalance,
      allowDuringProbation,
      leaveCategory: leaveCategory as 'ANNUAL' | 'EVENT',
      leaveLimitType: leaveLimitType as 'PER_YEAR' | 'PER_EVENT' | 'MEDICAL_BASED',
      dayCountType: dayCountType as 'WORKING_DAY' | 'CALENDAR_DAY',
    },
  })

  // Auto-create LeaveBalance for all users for the current year if this type has a quota
  if (leaveType.maxDaysPerYear != null) {
    const currentYear = new Date().getFullYear()
    const users = await prisma.user.findMany({
      where: { employee: { isNot: null } },
      select: { id: true },
    })
    await prisma.leaveBalance.createMany({
      data: users.map((u) => ({
        userId: u.id,
        leaveTypeId: leaveType.id,
        year: currentYear,
        totalDays: leaveType.maxDaysPerYear!,
        usedDays: 0,
      })),
      skipDuplicates: true,
    })
  }

  revalidatePath('/admin/settings')
  revalidatePath('/hr/leave-balance-report')
  return { success: true, message: `เพิ่มประเภทการลา "${name}" เรียบร้อยแล้ว` }
}
