require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Find ornnatthan's user + employee
  const user = await prisma.user.findUnique({
    where: { email: 'ornnatthan.thipkaew@company.com' },
    include: { employee: { include: { leaveBalances: { include: { leaveType: { select: { name: true } } } } } } },
  })
  if (!user) { console.log('User not found'); return }
  console.log('User:', user.email)
  console.log('Employee:', user.employee?.id)
  console.log('Leave balances:', user.employee?.leaveBalances?.length ?? 0)
  user.employee?.leaveBalances?.forEach(b => {
    console.log(' -', b.leaveType.name, '| total:', b.totalDays, '| used:', b.usedDays, '| remaining:', b.totalDays - b.usedDays)
  })

  // Also show all leave types
  const leaveTypes = await prisma.leaveType.findMany({ select: { id: true, name: true, maxDaysPerYear: true } })
  console.log('\nAll leave types:', leaveTypes.length)
  leaveTypes.forEach(lt => console.log(' -', lt.name, '| maxDaysPerYear:', lt.maxDaysPerYear))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
