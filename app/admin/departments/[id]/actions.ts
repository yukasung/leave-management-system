'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type DepartmentFormState = {
  success: boolean
  message: string
  errors?: { name?: string }
}

export async function updateDepartment(
  id: string,
  _prev: DepartmentFormState,
  formData: FormData,
): Promise<DepartmentFormState> {
  const session = await auth()
  if (!session || !session.user.isAdmin) {
    return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const name = (formData.get('name') as string | null)?.trim() ?? ''

  if (!name) {
    return { success: false, message: 'กรุณากรอกชื่อแผนก', errors: { name: 'ชื่อแผนกจำเป็น' } }
  }

  const duplicate = await prisma.department.findFirst({
    where: { name, id: { not: id } },
  })
  if (duplicate) {
    return { success: false, message: 'ชื่อแผนกนี้มีอยู่แล้ว', errors: { name: 'ชื่อแผนกซ้ำ' } }
  }

  await prisma.$transaction(async (tx) => {
    await tx.department.update({
      where: { id },
      data: { name },
    })

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_DEPARTMENT',
        entityType: 'Department',
        entityId: id,
        description: `Updated department: ${name}`,
      },
    })
  })

  revalidatePath('/admin/departments')
  return { success: true, message: 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว' }
}

export async function deleteDepartment(id: string): Promise<DepartmentFormState> {
  const session = await auth()
  if (!session || !session.user.isAdmin) {
    return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const employeeCount = await prisma.employee.count({ where: { departmentId: id } })
  if (employeeCount > 0) {
    return {
      success: false,
      message: `ไม่สามารถลบได้ เนื่องจากมีพนักงานอยู่ในแผนกนี้ ${employeeCount} คน`,
    }
  }

  const dept = await prisma.department.findUnique({ where: { id }, select: { name: true } })

  await prisma.$transaction(async (tx) => {
    await tx.department.delete({ where: { id } })

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DELETE_DEPARTMENT',
        entityType: 'Department',
        entityId: id,
        description: `Deleted department: ${dept?.name ?? id}`,
      },
    })
  })

  revalidatePath('/admin/departments')
  return { success: true, message: 'ลบแผนกเรียบร้อยแล้ว' }
}
