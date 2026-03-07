'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type PositionFormState = {
  success: boolean
  message: string
  errors?: { name?: string }
}

export async function createPosition(
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

  const existing = await prisma.position.findUnique({ where: { name } })
  if (existing) {
    return { success: false, message: 'ชื่อตำแหน่งนี้มีอยู่แล้ว', errors: { name: 'ชื่อซ้ำ' } }
  }

  await prisma.position.create({ data: { name } })
  revalidatePath('/admin/settings')
  return { success: true, message: `เพิ่มตำแหน่ง "${name}" เรียบร้อยแล้ว` }
}
