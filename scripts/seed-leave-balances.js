require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const CURRENT_YEAR = new Date().getFullYear()

async function main() {
  const [users, leaveTypes] = await Promise.all([
    prisma.user.findMany({ select: { id: true, email: true } }),
    prisma.leaveType.findMany({ select: { id: true, name: true, maxDaysPerYear: true } }),
  ])

  console.log(`Users: ${users.length}, LeaveTypes: ${leaveTypes.length}`)

  let created = 0
  let skipped = 0

  for (const user of users) {
    for (const lt of leaveTypes) {
      const existing = await prisma.leaveBalance.findUnique({
        where: { userId_leaveTypeId_year: { userId: user.id, leaveTypeId: lt.id, year: CURRENT_YEAR } },
      })
      if (existing) {
        skipped++
        continue
      }
      await prisma.leaveBalance.create({
        data: {
          userId: user.id,
          leaveTypeId: lt.id,
          year: CURRENT_YEAR,
          totalDays: lt.maxDaysPerYear ?? 0,
          usedDays: 0,
        },
      })
      console.log(`Created balance: ${user.email} | ${lt.name} | ${lt.maxDaysPerYear ?? 0} days`)
      created++
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} already existed`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
