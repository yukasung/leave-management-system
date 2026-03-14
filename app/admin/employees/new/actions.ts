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
    const role         = formData.get('role') as string | null
    const roleName     = role === 'admin' ? 'ADMIN' : role === 'manager' ? 'MANAGER' : 'EMPLOYEE'
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

    // ── Uniqueness checks (parallel) ─────────────────────────────────────────
    const [existingCode, existingEmail] = await Promise.all([
      prisma.employee.findUnique({ where: { employeeCode }, select: { id: true } }),
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
    ])

    if (existingCode)  errors.employeeCode = 'รหัสพนักงานนี้ถูกใช้งานแล้ว'
    if (existingEmail) errors.email        = 'อีเมลนี้ถูกใช้งานแล้ว'

    if (Object.keys(errors).length > 0) {
      return { success: false, errors }
    }

    // ── Pre-compute values that can't run inside transaction ─────────────────
    const currentYear     = new Date().getFullYear()
    const defaultPassword = await hash('admin1234', 10)

    const [leaveTypes, existingUser, roleRecord] = await Promise.all([
      prisma.leaveType.findMany({ where: { maxDaysPerYear: { not: null } }, select: { id: true, maxDaysPerYear: true } }),
      prisma.user.findUnique({ where: { email }, select: { id: true } }),
      prisma.role.findUnique({ where: { name: roleName as 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' }, select: { id: true } }),
    ])

    // ── Single atomic transaction: Employee + User + LeaveBalances + AuditLog ─
    const employee = await prisma.$transaction(async (tx) => {
      // 1. Resolve or create User account
      let userId: string
      if (existingUser) {
        userId = existingUser.id
        // Ensure avatarUrl is synced on existing user
        await tx.user.update({
          where: { id: userId },
          data: { avatarUrl: avatarUrl ?? null, ...(roleRecord ? { roleId: roleRecord.id } : {}) },
        })
      } else {
        const newUser = await tx.user.create({
          data: {
            email,
            name:      `${firstName} ${lastName}`,
            password:  defaultPassword,
            avatarUrl: avatarUrl ?? undefined,
            ...(roleRecord ? { roleId: roleRecord.id } : {}),
          },
        })
        userId = newUser.id
      }

      // 2. Create Employee linked to User
      const emp = await tx.employee.create({
        data: {
          employeeCode,
          firstName,
          lastName,
          phone,
          isProbation,
          isActive: true,
          userId,
          ...(positionId   ? { positionRef: { connect: { id: positionId   } } } : {}),
          ...(departmentId ? { department:  { connect: { id: departmentId } } } : {}),
          ...(approverIds.length > 0 ? { approvers: { connect: approverIds.map(id => ({ id })) } } : {}),
        },
        select: { id: true, employeeCode: true, firstName: true, lastName: true },
      })

      // 3. Create LeaveBalances for current year
      await tx.leaveBalance.createMany({
        data: leaveTypes.map((lt) => ({
          userId,
          leaveTypeId: lt.id,
          year:        currentYear,
          totalDays:   lt.maxDaysPerYear ?? 0,
          usedDays:    0,
        })),
        skipDuplicates: true,
      })

      // 4. Audit log
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
