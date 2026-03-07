'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type DepartmentFormState = {
  success: boolean
  message: string
  errors?: { name?: string; managerId?: string }
}

export async function createDepartment(
  _prev: DepartmentFormState,
  formData: FormData,
): Promise<DepartmentFormState> {
  const session = await auth()
  if (!session || !session.user.isAdmin) {
    return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  const managerId = (formData.get('managerId') as string | null)?.trim() || null

  if (!name) {
    return { success: false, message: 'กรุณากรอกชื่อแผนก', errors: { name: 'ชื่อแผนกจำเป็น' } }
  }

  const existing = await prisma.department.findUnique({ where: { name } })
  if (existing) {
    return { success: false, message: 'ชื่อแผนกนี้มีอยู่แล้ว', errors: { name: 'ชื่อแผนกซ้ำ' } }
  }

  await prisma.$transaction(async (tx) => {
    const dept = await tx.department.create({
      data: { name, managerId },
    })

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CREATE_DEPARTMENT',
        entityType: 'Department',
        entityId: dept.id,
        description: `Created department: ${name}`,
      },
    })
  })

  revalidatePath('/admin/departments')
  return { success: true, message: `เพิ่มแผนก "${name}" เรียบร้อยแล้ว` }
}
