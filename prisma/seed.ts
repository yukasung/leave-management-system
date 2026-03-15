import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ── Roles ─────────────────────────────────────────────────────────────────
  const rolesData = [
    { name: 'ADMIN' as const,    description: 'ผู้ดูแลระบบ' },
    { name: 'HR' as const,       description: 'HR / บุคคล' },
    { name: 'MANAGER' as const,  description: 'ผู้จัดการ' },
    { name: 'EMPLOYEE' as const, description: 'พนักงาน' },
  ]
  const roleMap: Record<string, string> = {}
  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: r,
    })
    roleMap[r.name] = role.id
  }

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

  // ── Leave categories ───────────────────────────────────────────────────────
  const categoriesData = [
    { key: 'annual',  name: 'ลาประจำปี', color: 'blue', sortOrder: 1 },
    { key: 'special', name: 'ลาพิเศษ',   color: 'pink', sortOrder: 2 },
  ]
  const catMap: Record<string, string> = {}
  for (const cat of categoriesData) {
    const record = await prisma.leaveCategoryConfig.upsert({
      where: { key: cat.key },
      update: { name: cat.name, color: cat.color, sortOrder: cat.sortOrder },
      create: cat,
    })
    catMap[cat.key] = record.id
  }

  // Assign leave types to categories
  const typeToCategory: Record<string, string> = {
    'ลาป่วย':         'annual',
    'ลากิจส่วนตัว':   'annual',
    'ลาพักร้อน':      'annual',
    'ลาฌาปนกิจ':      'special',
    'ลาแต่งงาน':      'special',
    'ลาอุปสมบท':      'special',
    'ลาคลอดบุตร':     'special',
    'ลาทำหมัน':       'special',
    'ลาพัฒนาความรู้': 'special',
  }
  for (const [typeName, catKey] of Object.entries(typeToCategory)) {
    await prisma.leaveType.updateMany({
      where: { name: typeName },
      data: { leaveCategoryId: catMap[catKey] },
    })
  }

  const hashedPassword = await hash('admin1234', 10)

  // Admin user (no department)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: { name: 'Admin', password: hashedPassword, roleId: roleMap['ADMIN'] },
    create: {
      email: 'admin@company.com',
      name: 'Admin',
      password: hashedPassword,
      roleId: roleMap['ADMIN'],
    },
  })

  // Manager user
  const manager = await prisma.user.upsert({
    where: { email: 'manager@company.com' },
    update: { name: 'Manager', password: hashedPassword, roleId: roleMap['MANAGER'] },
    create: {
      email: 'manager@company.com',
      name: 'Manager',
      password: hashedPassword,
      roleId: roleMap['MANAGER'],
    },
  })

  // Department
  const department = await prisma.department.upsert({
    where: { name: 'IT Department' },
    update: {},
    create: { name: 'IT Department' },
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
    update: { password: hashedPassword, roleId: roleMap['EMPLOYEE'] },
    create: {
      email: 'employee@company.com',
      name: 'Employee',
      password: hashedPassword,
      roleId: roleMap['EMPLOYEE'],
    },
  })

  // Employee records — required so auth.ts can read isAdmin / isManager
  await prisma.employee.upsert({
    where: { employeeCode: 'ADMIN001' },
    update: { userId: admin.id },
    create: {
      employeeCode: 'ADMIN001',
      firstName: 'Admin',
      lastName: 'System',
      isProbation: false,
      isActive: true,
      userId: admin.id,
    },
  })

  await prisma.employee.upsert({
    where: { employeeCode: 'MGR001' },
    update: { userId: manager.id, departmentId: department.id },
    create: {
      employeeCode: 'MGR001',
      firstName: 'Manager',
      lastName: 'System',
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