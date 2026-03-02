'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { compare, hash } from 'bcryptjs'
import { revalidatePath } from 'next/cache'

// ── Update basic profile info ─────────────────────────────────────────────────
export async function updateProfile(
  _prev: { success: boolean; message: string },
  formData: FormData,
) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: 'ไม่ได้เข้าสู่ระบบ' }

  const userId   = session.user.id
  const name     = (formData.get('name') as string | null)?.trim()
  const phone    = (formData.get('phone') as string | null)?.trim() || null
  const avatarUrl = (formData.get('avatarUrl') as string | null)?.trim() || null

  if (!name) return { success: false, message: 'กรุณากรอกชื่อ' }

  // Update User (name + phone + avatarUrl)
  await prisma.user.update({ where: { id: userId }, data: { name, phone, avatarUrl } })

  revalidatePath('/profile')
  revalidatePath('/dashboard')
  return { success: true, message: 'บันทึกข้อมูลสำเร็จ' }
}

// ── Change password ───────────────────────────────────────────────────────────
export async function changePassword(
  _prev: { success: boolean; message: string },
  formData: FormData,
) {
  const session = await auth()
  if (!session?.user?.id) return { success: false, message: 'ไม่ได้เข้าสู่ระบบ' }

  const userId      = session.user.id
  const currentPwd  = formData.get('currentPassword') as string
  const newPwd      = formData.get('newPassword') as string
  const confirmPwd  = formData.get('confirmPassword') as string

  if (!currentPwd || !newPwd || !confirmPwd)
    return { success: false, message: 'กรุณากรอกข้อมูลให้ครบ' }

  if (newPwd.length < 6)
    return { success: false, message: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' }

  if (newPwd !== confirmPwd)
    return { success: false, message: 'รหัสผ่านใหม่ไม่ตรงกัน' }

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user?.password) return { success: false, message: 'บัญชีนี้ไม่สามารถเปลี่ยนรหัสผ่านได้' }

  const valid = await compare(currentPwd, user.password)
  if (!valid) return { success: false, message: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' }

  const hashed = await hash(newPwd, 10)
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } })

  return { success: true, message: 'เปลี่ยนรหัสผ่านสำเร็จ' }
}
