require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash('admin1234', 10)
  const result = await prisma.user.updateMany({ data: { password: hash } })
  console.log('Updated:', result.count, 'users')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
