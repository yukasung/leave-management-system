import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ── Leave types per company policy ────────────────────────────────────────
  const leaveTypesData = [
    {
      name: 'ลาป่วย',
      maxDaysPerYear: 30,
      maxDaysPerRequest: null,
      requiresAttachment: false,
      deductFromBalance: false,
      allowDuringProbation: true,
    },
    {
      name: 'ลาฌาปนกิจ',
      maxDaysPerYear: null,
      maxDaysPerRequest: 3,
      requiresAttachment: false,
      deductFromBalance: false,
      allowDuringProbation: true,
    },
    {
      name: 'ลาแต่งงาน',
      maxDaysPerYear: null,
      maxDaysPerRequest: 3,
      requiresAttachment: true,
      deductFromBalance: false,
      allowDuringProbation: true,
    },
    {
      name: 'ลาอุปสมบท',
      maxDaysPerYear: 5,
      maxDaysPerRequest: null,
      requiresAttachment: false,
      deductFromBalance: true,
      allowDuringProbation: true,
    },
    {
      name: 'ลาคลอดบุตร',
      maxDaysPerYear: null,
      maxDaysPerRequest: 98,
      requiresAttachment: false,
      deductFromBalance: false,
      allowDuringProbation: true,
    },
    {
      name: 'ลาทำหมัน',
      maxDaysPerYear: null,
      maxDaysPerRequest: null,
      requiresAttachment: true,
      deductFromBalance: false,
      allowDuringProbation: true,
    },
    {
      name: 'ลาพัฒนาความรู้',
      maxDaysPerYear: 5,
      maxDaysPerRequest: null,
      requiresAttachment: false,
      deductFromBalance: true,
      allowDuringProbation: true,
    },
    {
      name: 'ลากิจส่วนตัว',
      maxDaysPerYear: 6,
      maxDaysPerRequest: null,
      requiresAttachment: false,
      deductFromBalance: true,
      allowDuringProbation: true,
    },
    {
      name: 'ลาพักร้อน',
      maxDaysPerYear: 12,
      maxDaysPerRequest: null,
      requiresAttachment: false,
      deductFromBalance: true,
      allowDuringProbation: false,
    },
  ]

  for (const lt of leaveTypesData) {
    await prisma.leaveType.upsert({
      where: { name: lt.name },
      update: lt,
      create: lt,
    })
  }

  const hashedPassword = await hash('admin1234', 10)

  // Admin user (no department)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      name: 'Admin',
      password: hashedPassword,
    },
  })

  // Manager user
  const manager = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: {},
    create: {
      email: 'manager@company.com',
      name: 'Manager',
      password: hashedPassword,
    },
  })

  // Department with manager
  const department = await prisma.department.upsert({
    where: { name: 'IT Department' },
    update: { managerId: manager.id },
    create: {
      name: 'IT Department',
      managerId: manager.id,
    },
  })

  // Additional departments per company structure
  await prisma.department.createMany({
    data: [
      { name: 'Legal' },
      { name: 'Business Development' },
      { name: 'Accounting & Admin' },
    ],
    skipDuplicates: true,
  })

  // Employee user belonging to the department
  const employee = await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: {},
    create: {
      email: 'employee@company.com',
      name: 'Employee',
      password: hashedPassword,
      departmentId: department.id,
    },
  })

  // Assign manager to department
  await prisma.user.update({
    where: { id: manager.id },
    data: { departmentId: department.id },
  })

  // Employee records — required so auth.ts can read isAdmin / isManager
  await prisma.employee.upsert({
    where: { employeeCode: 'ADMIN001' },
    update: { isAdmin: true, isManager: false, userId: admin.id },
    create: {
      employeeCode: 'ADMIN001',
      firstName: 'Admin',
      lastName: 'System',
      email: 'admin@company.com',
      position: 'System Administrator',
      isAdmin: true,
      isManager: false,
      isProbation: false,
      isActive: true,
      userId: admin.id,
    },
  })

  await prisma.employee.upsert({
    where: { employeeCode: 'MGR001' },
    update: { isAdmin: false, isManager: true, userId: manager.id, departmentId: department.id },
    create: {
      employeeCode: 'MGR001',
      firstName: 'Manager',
      lastName: 'System',
      email: 'manager@company.com',
      position: 'IT Manager',
      isAdmin: false,
      isManager: true,
      isProbation: false,
      isActive: true,
      userId: manager.id,
      departmentId: department.id,
    },
  })

  await prisma.employee.upsert({
    where: { employeeCode: 'EMP001' },
    update: { userId: employee.id, departmentId: department.id },
    create: {
      employeeCode: 'EMP001',
      firstName: 'Employee',
      lastName: 'System',
      email: 'employee@company.com',
      position: 'Developer',
      isAdmin: false,
      isManager: false,
      isProbation: false,
      isActive: true,
      userId: employee.id,
      departmentId: department.id,
    },
  })

  // Leave balances — only for types that deduct from balance
  const leaveTypes = await prisma.leaveType.findMany({
    where: { deductFromBalance: true },
  })
  const year = new Date().getFullYear()

  for (const user of [admin, manager, employee]) {
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: { userId_leaveTypeId_year: { userId: user.id, leaveTypeId: lt.id, year } },
        update: {},
        create: {
          userId: user.id,
          leaveTypeId: lt.id,
          year,
          totalDays: lt.maxDaysPerYear ?? 0,
          usedDays: 0,
        },
      })
    }
  }

  console.log('✅ Seed completed')
  console.log('   Admin:    admin@company.com    / admin1234')
  console.log('   Manager:  manager@company.com  / admin1234')
  console.log('   Employee: employee@company.com / admin1234')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })