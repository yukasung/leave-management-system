'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type UpdateEmployeeState = {
  success?: boolean
  message?: string
  errors?: {
    departmentId?: string
    positionId?: string
    managerId?: string
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
    const isAdmin      = formData.get('isAdmin') === 'on'
    const departmentId = (formData.get('departmentId') as string | null)?.trim() || null
    const managerId    = (formData.get('managerId')    as string | null)?.trim() || null
    const isProbation  = formData.get('isProbation') === 'on'

    // ── Guard: cannot remove the last admin ──────────────────────────────────
    if (!isAdmin) {
      const currentEmp = await prisma.employee.findUnique({
        where: { id },
        select: { isAdmin: true },
      })
      if (currentEmp?.isAdmin) {
        const adminCount = await prisma.employee.count({ where: { isAdmin: true } })
        if (adminCount <= 1) {
          return {
            success: false,
            errors: { general: 'ไม่สามารถถอดสิทธิ์ Admin ได้ เนื่องจากต้องมี Admin อย่างน้อย 1 คนในระบบ' },
          }
        }
      }
    }

    // ── Validation ────────────────────────────────────────────────────────────
    const errors: UpdateEmployeeState['errors'] = {}

    if (!positionId) errors.positionId = 'กรุณาเลือกตำแหน่ง'
    if (!managerId) errors.managerId = 'กรุณาเลือกผู้จัดการสายงาน'

    if (Object.keys(errors).length > 0) {
      return { success: false, errors }
    }

    // ── Resolve position name from id ──────────────────────────────────────
    const positionRecord = await prisma.position.findUnique({
      where: { id: positionId! },
      select: { name: true },
    })
    if (!positionRecord) {
      return { success: false, errors: { positionId: 'ไม่พบตำแหน่งที่เลือก' } }
    }
    const position = positionRecord.name

    // ── Verify employee exists ────────────────────────────────────────────────
    const existing = await prisma.employee.findUnique({
      where: { id },
      select: { id: true, firstName: true, lastName: true, employeeCode: true },
    })
    if (!existing) {
      return { success: false, errors: { general: 'ไม่พบข้อมูลพนักงาน' } }
    }

    // ── Update + audit ────────────────────────────────────────────────────────
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id },
        data: {
          position,
          phone,
          avatarUrl,
          positionRef: positionId
            ? { connect: { id: positionId } }
            : { disconnect: true },
          isAdmin,
          isProbation,
          department: departmentId
            ? { connect: { id: departmentId } }
            : { disconnect: true },
          manager: managerId
            ? { connect: { id: managerId } }
            : { disconnect: true },
        },
      })

      await tx.auditLog.create({
        data: {
          userId:      session.user.id,
          action:      'UPDATE_EMPLOYEE',
          entityType:  'Employee',
          entityId:    id,
          description: `Updated employee ${existing.firstName} ${existing.lastName} (${existing.employeeCode}): isAdmin=${isAdmin}, position=${position}`,
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
