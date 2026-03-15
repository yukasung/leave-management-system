/**
 * Backfill User.departmentId from linked Employee.departmentId.
 * Run once to fix existing records where User.departmentId is null
 * but the linked Employee has a departmentId.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const employees = await prisma.employee.findMany({
    where: { userId: { not: null }, departmentId: { not: null } },
    select: { userId: true, departmentId: true, firstName: true, lastName: true },
  })
  console.log(`Employees with userId + departmentId: ${employees.length}`)

  let updated = 0
  for (const emp of employees) {
    await prisma.user.update({
      where: { id: emp.userId },
      data: { departmentId: emp.departmentId },
    })
    console.log(`  synced: ${emp.firstName} ${emp.lastName} → departmentId=${emp.departmentId}`)
    updated++
  }
  console.log(`\nDone — synced ${updated} User records`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
