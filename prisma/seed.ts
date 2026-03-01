import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hash } from 'bcryptjs'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Leave types
  await prisma.leaveType.createMany({
    data: [
      { name: 'ลาป่วย', daysPerYear: 30 },
      { name: 'ลากิจ', daysPerYear: 10 },
      { name: 'ลาพักร้อน', daysPerYear: 6 },
    ],
    skipDuplicates: true,
  })

  const hashedPassword = await hash('admin1234', 10)

  // Admin user (no department)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@company.com' },
    update: {},
    create: {
      email: 'admin@company.com',
      name: 'Admin',
      password: hashedPassword,
      role: 'ADMIN',
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
      role: 'MANAGER',
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

  // Employee user belonging to the department
  const employee = await prisma.user.upsert({
    where: { email: 'employee@company.com' },
    update: {},
    create: {
      email: 'employee@company.com',
      name: 'Employee',
      password: hashedPassword,
      role: 'EMPLOYEE',
      departmentId: department.id,
    },
  })

  // Assign manager to department
  await prisma.user.update({
    where: { id: manager.id },
    data: { departmentId: department.id },
  })

  // Leave balances for all users
  const leaveTypes = await prisma.leaveType.findMany()
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
          totalDays: lt.daysPerYear,
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