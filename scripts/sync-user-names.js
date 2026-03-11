require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const employees = await prisma.employee.findMany({
    where: { userId: { not: null } },
    select: { userId: true, firstName: true, lastName: true, email: true },
  })

  let updated = 0
  for (const emp of employees) {
    const fullName = `${emp.firstName} ${emp.lastName}`
    await prisma.user.update({
      where: { id: emp.userId },
      data: { name: fullName },
    })
    console.log(`Updated: ${emp.email} → ${fullName}`)
    updated++
  }
  console.log(`\nDone: ${updated} users updated`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
