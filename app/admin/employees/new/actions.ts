'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type CreateEmployeeState = {
  success?: boolean
  message?: string
  errors?: {
    employeeCode?: string
    firstName?: string
    lastName?: string
    email?: string
    departmentId?: string
    positionId?: string
    role?: string
    managerId?: string
    general?: string
  }
}

const VALID_ROLES = ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE', 'EXECUTIVE'] as const
type EmployeeRole = (typeof VALID_ROLES)[number]

export async function createEmployee(
  _prevState: CreateEmployeeState,
  formData: FormData
): Promise<CreateEmployeeState> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    }
    if (session.user.role !== 'ADMIN') {
      return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }
    }

    // ── Extract fields ───────────────────────────────────────────────────────
    const employeeCode = (formData.get('employeeCode') as string | null)?.trim() ?? ''
    const firstName    = (formData.get('firstName')    as string | null)?.trim() ?? ''
    const lastName     = (formData.get('lastName')     as string | null)?.trim() ?? ''
    const email        = (formData.get('email')        as string | null)?.trim().toLowerCase() ?? ''
    const phone        = (formData.get('phone')        as string | null)?.trim() || null
    const avatarUrl    = (formData.get('avatarUrl')    as string | null)?.trim() || null
    const departmentId = (formData.get('departmentId') as string | null)?.trim() || null
    const positionId   = (formData.get('positionId')   as string | null)?.trim() || null
    const role         = (formData.get('role')         as string | null)?.trim() ?? ''
    const managerId    = (formData.get('managerId')    as string | null)?.trim() || null
    const isProbation  = formData.get('isProbation') === 'on'

    // ── Validation ───────────────────────────────────────────────────────────
    const errors: CreateEmployeeState['errors'] = {}

    if (!employeeCode) errors.employeeCode = 'กรุณากรอกรหัสพนักงาน'
    if (!firstName)    errors.firstName    = 'กรุณากรอกชื่อ'
    if (!lastName)     errors.lastName     = 'กรุณากรอกนามสกุล'
    if (!email)        errors.email        = 'กรุณากรอกอีเมล'
    if (!positionId)   errors.positionId   = 'กรุณาเลือกตำแหน่ง'
    if (!role || !VALID_ROLES.includes(role as EmployeeRole)) {
      errors.role = 'กรุณาเลือกบทบาท'
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'รูปแบบอีเมลไม่ถูกต้อง'
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors }
    }

    // ── Resolve position name from id ─────────────────────────────────────────
    const positionRecord = await prisma.position.findUnique({
      where: { id: positionId! },
      select: { name: true },
    })
    if (!positionRecord) {
      return { success: false, errors: { positionId: 'ไม่พบตำแหน่งที่เลือก' } }
    }
    const position = positionRecord.name

    // ── Uniqueness checks (parallel) ─────────────────────────────────────────
    const [existingCode, existingEmail] = await Promise.all([
      prisma.employee.findUnique({ where: { employeeCode }, select: { id: true } }),
      prisma.employee.findUnique({ where: { email },        select: { id: true } }),
    ])

    if (existingCode) errors.employeeCode = 'รหัสพนักงานนี้ถูกใช้งานแล้ว'
    if (existingEmail) errors.email       = 'อีเมลนี้ถูกใช้งานแล้ว'

    if (Object.keys(errors).length > 0) {
      return { success: false, errors }
    }

    // ── Create employee + audit log ─────────────────────────────────────────
    const employee = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.create({
        data: {
          employeeCode,
          firstName,
          lastName,
          email,
          phone,
          avatarUrl,
          position,
          role:         role as EmployeeRole,
          isProbation,
          isActive:     true,
          ...(positionId   ? { positionRef: { connect: { id: positionId   } } } : {}),
          ...(departmentId ? { department:  { connect: { id: departmentId } } } : {}),
          ...(managerId    ? { manager:     { connect: { id: managerId    } } } : {}),
        },
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      })

      await tx.auditLog.create({
        data: {
          userId:      session.user.id,
          action:      'CREATE_EMPLOYEE',
          entityType:  'Employee',
          entityId:    emp.id,
          description: `Created employee ${emp.firstName} ${emp.lastName} (${emp.employeeCode})`,
        },
      })

      return emp
    })

    revalidatePath('/admin/employees')

    return {
      success: true,
      message: `เพิ่มพนักงาน ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) เรียบร้อยแล้ว`,
    }
  } catch (err) {
    console.error('[createEmployee]', err)
    return { success: false, errors: { general: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' } }
  }
}
