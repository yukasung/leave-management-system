'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type PositionFormState = {
  success: boolean
  message: string
  errors?: { name?: string }
}

export async function updatePosition(
  id: string,
  _prev: PositionFormState,
  formData: FormData,
): Promise<PositionFormState> {
  const session = await auth()
  if (!session || !session.user.isAdmin) {
    return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const name = (formData.get('name') as string | null)?.trim() ?? ''
  if (!name) {
    return { success: false, message: 'กรุณากรอกชื่อตำแหน่ง', errors: { name: 'ชื่อตำแหน่งจำเป็น' } }
  }

  const duplicate = await prisma.position.findFirst({ where: { name, id: { not: id } } })
  if (duplicate) {
    return { success: false, message: 'ชื่อตำแหน่งนี้มีอยู่แล้ว', errors: { name: 'ชื่อซ้ำ' } }
  }

  await prisma.position.update({ where: { id }, data: { name } })
  revalidatePath('/admin/settings')
  return { success: true, message: 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว' }
}

export async function deletePosition(id: string): Promise<PositionFormState> {
  const session = await auth()
  if (!session || !session.user.isAdmin) {
    return { success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' }
  }

  const count = await prisma.employee.count({ where: { positionId: id } })
  if (count > 0) {
    return { success: false, message: `ไม่สามารถลบได้ เนื่องจากมีพนักงาน ${count} คนที่ใช้ตำแหน่งนี้` }
  }

  await prisma.position.delete({ where: { id } })
  revalidatePath('/admin/settings')
  return { success: true, message: 'ลบตำแหน่งเรียบร้อยแล้ว' }
}
