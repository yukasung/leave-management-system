require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const employees = await prisma.employee.findMany({
    where: { userId: null },
    select: { id: true, firstName: true, lastName: true, email: true },
  })

  console.log(`Found ${employees.length} employees without user accounts`)

  const hash = await bcrypt.hash('admin1234', 10)

  for (const emp of employees) {
    // Check if user with this email already exists
    const existing = await prisma.user.findUnique({ where: { email: emp.email } })
    if (existing) {
      // Just link
      await prisma.employee.update({ where: { id: emp.id }, data: { userId: existing.id } })
      console.log(`Linked existing user: ${emp.email}`)
    } else {
      const user = await prisma.user.create({
        data: {
          email: emp.email,
          name: `${emp.firstName} ${emp.lastName}`,
          password: hash,
        },
      })
      await prisma.employee.update({ where: { id: emp.id }, data: { userId: user.id } })
      console.log(`Created + linked: ${emp.email}`)
    }
  }

  console.log('Done')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
