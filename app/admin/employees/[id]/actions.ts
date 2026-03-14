'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export type UpdateEmployeeState = {
  success?: boolean
  message?: string
  errors?: {
    departmentId?: string
    positionId?: string
    managerId?: string
    employeeCode?: string
    password?: string
    general?: string
  }
}

export async function updateEmployee(
  id: string,
  _prevState: UpdateEmployeeState,
  formData: FormData
): Promise<UpdateEmployeeState> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (!session.user.isAdmin) {
      return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }
    }

    // ── Extract fields ────────────────────────────────────────────────────────────────
    const positionId   = (formData.get('positionId')   as string | null)?.trim() || null
    const phone        = (formData.get('phone')        as string | null)?.trim() || null
    const avatarUrl    = (formData.get('avatarUrl')    as string | null)?.trim() || null
    const employeeCode = (formData.get('employeeCode') as string | null)?.trim() || null
    const newPassword  = (formData.get('newPassword')  as string | null)?.trim() || null
    const confirmPassword = (formData.get('confirmPassword') as string | null)?.trim() || null

    const role         = formData.get('role') as string | null
    const roleName     = role === 'admin' ? 'ADMIN' : role === 'manager' ? 'MANAGER' : 'EMPLOYEE'
    const approverIds  = (formData.getAll('approverIds') as string[]).filter(Boolean)
    const departmentId = (formData.get('departmentId') as string | null)?.trim() || null
    const isProbation  = formData.get('isProbation') === 'on'

    // ── Guard: cannot remove the last admin ──────────────────────────────────
    if (roleName !== 'ADMIN') {
      const currentEmp = await prisma.employee.findUnique({
        where: { id },
        select: { user: { select: { role: { select: { name: true } } } } },
      })
      if (currentEmp?.user?.role?.name === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: { name: 'ADMIN' } } })
        if (adminCount <= 1) {
          return {
            success: false,
            errors: { general: 'ไม่สามารถถอดสิทธิ์ Admin ได้ เนื่องจากต้องมี Admin อย่างน้อย 1 คนในระบบ' },
          }
        }
      }
    }

    // ── Look up target role record ────────────────────────────────────────────
    const roleRecord = await prisma.role.findUnique({
      where: { name: roleName as 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' },
      select: { id: true },
    })

    // ── Validation ────────────────────────────────────────────────────────────
    const errors: UpdateEmployeeState['errors'] = {}

    if (!departmentId) errors.departmentId = 'กรุณาเลือกแผนก'
    if (!positionId)   errors.positionId   = 'กรุณาเลือกตำแหน่ง'
    if (!employeeCode) {
      errors.employeeCode = 'กรุณากรอกรหัสพนักงาน'
    } else {
      const duplicate = await prisma.employee.findFirst({
        where: { employeeCode, NOT: { id } },
        select: { id: true },
      })
      if (duplicate) errors.employeeCode = 'รหัสพนักงานนี้ถูกใช้งานแล้ว'
    }
    if (newPassword) {
      if (newPassword.length < 6) errors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
      else if (newPassword !== confirmPassword) errors.password = 'รหัสผ่านไม่ตรงกัน'
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors }
    }

    // ── Verify employee exists ────────────────────────────────────────────────
    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, userId: true },
    })
    if (!existing) {
      return { success: false, errors: { general: 'ไม่พบข้อมูลพนักงาน' } }
    }

    // ── Update + audit ────────────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: {
          phone,
          employeeCode: employeeCode!,
          positionRef: positionId
            ? { connect: { id: positionId } }
            : { disconnect: true },
          isProbation,
          approvers: { set: approverIds.map(id => ({ id })) },
          department: departmentId
            ? { connect: { id: departmentId } }
            : { disconnect: true },
        },
      })

      // Keep User fields in sync (avatarUrl, role, password)
      if (existing.userId) {
        const userUpdateData: Record<string, unknown> = {
          avatarUrl: avatarUrl ?? null,
          ...(roleRecord ? { roleId: roleRecord.id } : {}),
        }
        if (newPassword) {
          userUpdateData.password = await bcrypt.hash(newPassword, 12)
        }
        await tx.user.update({
          where: { id: existing.userId },
          data: userUpdateData,
        })
      }

      await tx.auditLog.create({
        data: {
          userId:      session.user.id,
          action:      'UPDATE_EMPLOYEE',
          entityType:  'Employee',
          entityId:    id,
          description: `Updated employee ${existing.firstName} ${existing.lastName} (${existing.employeeCode}): role=${roleName}, positionId=${positionId}`,
        },
      })
    })

    revalidatePath('/admin/employees')
    revalidatePath(`/admin/employees/${id}`)

    return {
      success: true,
      message: `อัปเดตข้อมูล ${existing.firstName} ${existing.lastName} เรียบร้อยแล้ว`,
    }
  } catch (err) {
    console.error('[updateEmployee]', err)
    const msg = process.env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    return { success: false, errors: { general: msg } }
  }
}

// ── Soft delete ───────────────────────────────────────────────────────────────

export type DeactivateState = { success?: boolean; message?: string }

export async function deactivateEmployee(id: string): Promise<DeactivateState> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (!session.user.isAdmin) {
      return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, isActive: true },
    })
    if (!employee) return { success: false, message: 'ไม่พบข้อมูลพนักงาน' }
    if (!employee.isActive) return { success: false, message: 'พนักงานนี้ถูกระงับการใช้งานแล้ว' }

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: { isActive: false },
      })

      await tx.auditLog.create({
        data: {
          userId:      session.user.id,
          action:      'DEACTIVATE_EMPLOYEE',
          entityType:  'Employee',
          entityId:    id,
          description: `Deactivated employee ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
        },
      })
    })

    revalidatePath('/admin/employees')
    revalidatePath(`/admin/employees/${id}`)

    return {
      success: true,
      message: `ระงับการใช้งาน ${employee.firstName} ${employee.lastName} เรียบร้อยแล้ว`,
    }
  } catch (err) {
    console.error('[deactivateEmployee]', err)
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}

// ── Reactivate ────────────────────────────────────────────────────────────────

export async function reactivateEmployee(id: string): Promise<DeactivateState> {
  try {
    const session = await auth()
    if (!session?.user?.id) return { success: false, message: 'กรุณาเข้าสู่ระบบก่อน' }
    if (!session.user.isAdmin) {
      return { success: false, message: 'คุณไม่มีสิทธิ์ดำเนินการนี้' }
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, employeeCode: true, isActive: true },
    })
    if (!employee) return { success: false, message: 'ไม่พบข้อมูลพนักงาน' }
    if (employee.isActive) return { success: false, message: 'พนักงานนี้ใช้งานอยู่แล้ว' }

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: { isActive: true },
      })

      await tx.auditLog.create({
        data: {
          userId:      session.user.id,
          action:      'REACTIVATE_EMPLOYEE',
          entityType:  'Employee',
          entityId:    id,
          description: `Reactivated employee ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`,
        },
      })
    })

    revalidatePath('/admin/employees')
    revalidatePath(`/admin/employees/${id}`)

    return {
      success: true,
      message: `เปิดใช้งาน ${employee.firstName} ${employee.lastName} เรียบร้อยแล้ว`,
    }
  } catch (err) {
    console.error('[reactivateEmployee]', err)
    return { success: false, message: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' }
  }
}
