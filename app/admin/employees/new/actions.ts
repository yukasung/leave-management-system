'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { hash } from 'bcryptjs'

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
    managerId?: string
    general?: string
  }
}

export async function createEmployee(
  _prevState: CreateEmployeeState,
  formData: FormData
): Promise<CreateEmployeeState> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    }
    if (!session.user.isAdmin) {
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
    const isAdmin      = formData.get('isAdmin') === 'on'
    const isManager    = formData.get('isManager') === 'on'
    const approverIds  = (formData.getAll('approverIds') as string[]).filter(Boolean)
    const isProbation  = formData.get('isProbation') === 'on'

    // ── Validation ───────────────────────────────────────────────────────────────────
    const errors: CreateEmployeeState['errors'] = {}

    if (!employeeCode)  errors.employeeCode  = 'กรุณากรอกรหัสพนักงาน'
    if (!firstName)     errors.firstName     = 'กรุณากรอกชื่อ'
    if (!lastName)      errors.lastName      = 'กรุณากรอกนามสกุล'
    if (!email)         errors.email         = 'กรุณากรอกอีเมล'
    if (!departmentId)  errors.departmentId  = 'กรุณาเลือกแผนก'
    if (!positionId)    errors.positionId    = 'กรุณาเลือกตำแหน่ง'

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
          isAdmin,
          isManager,
          isProbation,
          isActive:     true,
          ...(positionId   ? { positionRef: { connect: { id: positionId   } } } : {}),
          ...(departmentId ? { department:  { connect: { id: departmentId } } } : {}),
          ...(approverIds.length > 0 ? { approvers: { connect: approverIds.map(id => ({ id })) } } : {}),
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

    // ── Create User account + LeaveBalances for current year ─────────────────
    const currentYear = new Date().getFullYear()
    const [leaveTypes, existingUser] = await Promise.all([
      prisma.leaveType.findMany({ select: { id: true, maxDaysPerYear: true } }),
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ])

    let userId: string
    if (existingUser) {
      userId = existingUser.id
      await prisma.employee.update({ where: { id: employee.id }, data: { userId } })
    } else {
      const defaultPassword = await hash('admin1234', 10)
      const newUser = await prisma.user.create({
        data: {
          email,
          name: `${firstName} ${lastName}`,
          password: defaultPassword,
        },
      })
      userId = newUser.id
      await prisma.employee.update({ where: { id: employee.id }, data: { userId } })
    }

    await Promise.all(
      leaveTypes.map((lt) =>
        prisma.leaveBalance.upsert({
          where: { userId_leaveTypeId_year: { userId, leaveTypeId: lt.id, year: currentYear } },
          create: { userId, leaveTypeId: lt.id, year: currentYear, totalDays: lt.maxDaysPerYear ?? 0, usedDays: 0 },
          update: {},
        })
      )
    )

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
