'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type LeaveTypeFormState = {
  success: boolean
  message: string
  errors?: { name?: string }
}

export async function updateLeaveType(
  id: string,
  _prev: LeaveTypeFormState,
  formData: FormData,
): Promise<LeaveTypeFormState> {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
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

  const duplicate = await prisma.leaveType.findFirst({
    where: { name, id: { not: id } },
  })
  if (duplicate) {
    return { success: false, message: 'ชื่อประเภทการลานี้มีอยู่แล้ว', errors: { name: 'ชื่อซ้ำ' } }
  }

  await prisma.leaveType.update({
    where: { id },
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
  return { success: true, message: 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว' }
}

export async function deleteLeaveType(id: string): Promise<LeaveTypeFormState> {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const requestCount = await prisma.leaveRequest.count({ where: { leaveTypeId: id } })
  if (requestCount > 0) {
    return {
      success: false,
      message: `ไม่สามารถลบได้ เนื่องจากมีคำขอลาที่ใช้ประเภทนี้อยู่ ${requestCount} รายการ`,
    }
  }

  // Delete related leave balances first, then delete the leave type
  await prisma.$transaction(async (tx) => {
    await tx.leaveBalance.deleteMany({ where: { leaveTypeId: id } })
    await tx.leaveType.delete({ where: { id } })
  })

  revalidatePath('/admin/settings')
  return { success: true, message: 'ลบประเภทการลาเรียบร้อยแล้ว' }
}
