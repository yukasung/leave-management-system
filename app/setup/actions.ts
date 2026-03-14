'use server'

import { prisma } from '@/lib/prisma'
import { seedRoles } from '@/lib/seed-roles'
import { hash } from 'bcryptjs'

export type SetupState = {
  success?: boolean
  message?: string
  errors?: {
    firstName?: string
    lastName?: string
    email?: string
    password?: string
    confirmPassword?: string
    general?: string
  }
}

export async function initializeSystem(
  _prevState: SetupState,
  formData: FormData
): Promise<SetupState> {
  const isDevPreview =
    process.env.NODE_ENV === 'development' &&
    formData.get('_preview') === '1'

  // Security: abort if system already has users (prevents re-initialization)
  // Allow bypass only in development preview mode
  if (!isDevPreview) {
    const userCount = await prisma.user.count()
    if (userCount > 0) {
      return { success: false, errors: { general: 'ระบบได้รับการตั้งค่าแล้ว กรุณาเข้าสู่ระบบ' } }
    }
  }

  // ── Extract fields ─────────────────────────────────────────────────────────
  const firstName = (formData.get('firstName') as string | null)?.trim() ?? ''
  const lastName  = (formData.get('lastName')  as string | null)?.trim() ?? ''
  const email     = (formData.get('email')     as string | null)?.trim().toLowerCase() ?? ''
  const password  = (formData.get('password')  as string | null) ?? ''
  const confirm   = (formData.get('confirmPassword') as string | null) ?? ''

  // ── Validation ─────────────────────────────────────────────────────────────
  const errors: SetupState['errors'] = {}

  if (!firstName) errors.firstName = 'กรุณากรอกชื่อ'
  if (!lastName)  errors.lastName  = 'กรุณากรอกนามสกุล'
  if (!email)     errors.email     = 'กรุณากรอกอีเมล'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'รูปแบบอีเมลไม่ถูกต้อง'

  if (!password)           errors.password        = 'กรุณากรอกรหัสผ่าน'
  else if (password.length < 8) errors.password   = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร'
  if (password !== confirm) errors.confirmPassword = 'รหัสผ่านไม่ตรงกัน'

  if (Object.keys(errors).length > 0) return { success: false, errors }

  try {
    // ── Ensure all default roles exist (idempotent) ────────────────────────
    await seedRoles()

    // In dev preview, check for duplicate email and return a clear error
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return { success: false, errors: { email: 'อีเมลนี้มีในระบบแล้ว กรุณาใช้อีเมลอื่น' } }
    }

    const adminRole = await prisma.role.findUniqueOrThrow({
      where: { name: 'ADMIN' },
      select: { id: true },
    })

    const hashed = await hash(password, 12)

    // ── Generate a unique employee code ────────────────────────────────────
    let employeeCode = 'ADMIN001'
    const exists = await prisma.employee.findUnique({ where: { employeeCode } })
    if (exists) {
      employeeCode = `ADMIN${Date.now()}`
    }

    // ── Create User + Employee in one transaction ───────────────────────────
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name:     `${firstName} ${lastName}`,
          password: hashed,
          roleId:   adminRole.id,
          isActive: true,
        },
      })

      await tx.employee.create({
        data: {
          employeeCode,
          firstName,
          lastName,
          isActive:   true,
          isProbation: false,
          userId:     user.id,
        },
      })
    })

    return { success: true, message: 'ตั้งค่าระบบสำเร็จ! กรุณาเข้าสู่ระบบด้วยบัญชีที่สร้าง' }
  } catch (err) {
    console.error('[initializeSystem]', err)
    const msg =
      process.env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    return { success: false, errors: { general: msg } }
  }
}
