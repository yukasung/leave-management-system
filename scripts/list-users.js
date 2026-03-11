require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log('All users in User table:')
  users.forEach(u => console.log(` id: ${u.id.substring(0,8)}... | email: ${u.email} | name: ${u.name} | created: ${u.createdAt}`))

  const employees = await prisma.employee.findMany({
    select: { id: true, email: true, firstName: true, lastName: true, userId: true },
    orderBy: { createdAt: 'asc' },
  })
  console.log('\nAll employees:')
  employees.forEach(e => console.log(` email: ${e.email} | name: ${e.firstName} ${e.lastName} | userId: ${e.userId?.substring(0,8) ?? 'NULL'}...`))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
