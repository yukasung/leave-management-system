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

  if (!name) {
    return { success: false, message: 'กรุณากรอกชื่อประเภทการลา', errors: { name: 'ชื่อจำเป็น' } }
  }

  const existing = await prisma.leaveType.findUnique({ where: { name } })
  if (existing) {
    return { success: false, message: 'ชื่อประเภทการลานี้มีอยู่แล้ว', errors: { name: 'ชื่อซ้ำ' } }
  }

  await prisma.leaveType.create({
    data: {
      name,
      maxDaysPerYear: maxDaysPerYear ? parseFloat(maxDaysPerYear as string) : null,
      maxDaysPerRequest: maxDaysPerRequest ? parseFloat(maxDaysPerRequest as string) : null,
      requiresAttachment,
      deductFromBalance,
      allowDuringProbation,
    },
  })

  revalidatePath('/admin/settings')
  return { success: true, message: `เพิ่มประเภทการลา "${name}" เรียบร้อยแล้ว` }
}
