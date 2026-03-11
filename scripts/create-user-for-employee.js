require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Find employee with this email
  const employee = await prisma.employee.findFirst({
    where: { email: 'ornnatthan.thipkaew@company.com' },
    select: { id: true, firstName: true, lastName: true, email: true, userId: true },
  })

  if (!employee) {
    console.log('Employee not found')
    return
  }

  console.log('Found employee:', employee)

  if (employee.userId) {
    console.log('Already has userId:', employee.userId, '— updating password')
    const hash = await bcrypt.hash('admin1234', 10)
    await prisma.user.update({ where: { id: employee.userId }, data: { password: hash } })
    console.log('Password updated')
    return
  }

  // Create user and link to employee
  const hash = await bcrypt.hash('admin1234', 10)
  const user = await prisma.user.create({
    data: {
      email: employee.email,
      name: `${employee.firstName} ${employee.lastName}`,
      password: hash,
    },
  })
  console.log('Created user:', user.email, user.id)

  await prisma.employee.update({
    where: { id: employee.id },
    data: { userId: user.id },
  })
  console.log('Linked employee to user')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
