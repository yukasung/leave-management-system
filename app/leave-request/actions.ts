'use server'

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

export type FormState = {
  success?: boolean
  message?: string
  errors?: {
    leaveTypeId?: string
    startDate?: string
    endDate?: string
    reason?: string
    general?: string
  }
}

function calcTotalDays(start: Date, end: Date): number {
  let count = 0
  const current = new Date(start)
  current.setHours(0, 0, 0, 0)
  const last = new Date(end)
  last.setHours(0, 0, 0, 0)

  while (current <= last) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

export async function createLeaveRequest(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const session = await auth()
  if (!session?.user?.id) {
    return { errors: { general: 'กรุณาเข้าสู่ระบบก่อน' } }
  }

  const leaveTypeId = formData.get('leaveTypeId') as string
  const startDateStr = formData.get('startDate') as string
  const endDateStr = formData.get('endDate') as string
  const reason = formData.get('reason') as string

  // Validation
  const errors: FormState['errors'] = {}
  if (!leaveTypeId) errors.leaveTypeId = 'กรุณาเลือกประเภทการลา'
  if (!startDateStr) errors.startDate = 'กรุณาเลือกวันที่เริ่มต้น'
  if (!endDateStr) errors.endDate = 'กรุณาเลือกวันที่สิ้นสุด'

  if (Object.keys(errors).length > 0) return { errors }

  const startDate = new Date(startDateStr)
  const endDate = new Date(endDateStr)

  // startDate must not be in the past
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  startDate.setHours(0, 0, 0, 0)
  endDate.setHours(0, 0, 0, 0)

  if (startDate < today) {
    return { errors: { startDate: 'วันที่เริ่มต้นต้องไม่เป็นวันที่ผ่านมาแล้ว' } }
  }

  // startDate must not be after endDate
  if (endDate < startDate) {
    return { errors: { endDate: 'วันที่สิ้นสุดต้องไม่น้อยกว่าวันที่เริ่มต้น' } }
  }

  const totalDays = calcTotalDays(startDate, endDate)
  if (totalDays === 0) {
    return { errors: { general: 'ไม่สามารถลาในวันหยุดสุดสัปดาห์ได้' } }
  }

  try {
    await prisma.$transaction(async (tx) => {
      const year = startDate.getFullYear()

      const balance = await tx.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: session.user.id,
            leaveTypeId,
            year,
          },
        },
      })

      const remaining = (balance?.totalDays ?? 0) - (balance?.usedDays ?? 0)

      if (totalDays > remaining) {
        throw new Error(`สิทธิ์การลาไม่เพียงพอ (คงเหลือ ${remaining} วัน แต่ขอลา ${totalDays} วัน)`)
      }

      const leaveRequest = await tx.leaveRequest.create({
        data: {
          userId: session.user.id,
          leaveTypeId,
          startDate,
          endDate,
          totalDays,
          reason: reason || null,
          status: 'PENDING',
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREATE_LEAVE_REQUEST',
          entityType: 'LeaveRequest',
          entityId: leaveRequest.id,
          description: `Employee submitted a leave request for ${totalDays} day(s)`,
        },
      })

      // Notify the department manager if one exists
      const requestingUser = await tx.user.findUnique({
        where: { id: session.user.id },
        select: {
          name: true,
          department: { select: { managerId: true } },
        },
      })

      const managerId = requestingUser?.department?.managerId
      if (managerId) {
        await tx.notification.create({
          data: {
            userId: managerId,
            message: `New leave request submitted by ${requestingUser!.name}`,
            isRead: false,
          },
        })
      }
    })

    revalidatePath('/leave-request')
    revalidatePath('/my-leaves')
    return { success: true, message: `ส่งคำขอลา ${totalDays} วันทำการเรียบร้อยแล้ว` }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    return { errors: { general: message } }
  }
}
