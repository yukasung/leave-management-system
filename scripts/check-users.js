require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')
const bcrypt = require('bcryptjs')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const users = await prisma.user.findMany({ select: { email: true, password: true } })
  console.log('Total users:', users.length)
  for (const u of users) {
    const match = u.password ? await bcrypt.compare('admin1234', u.password) : false
    console.log(u.email, '| hash:', u.password ? u.password.substring(0, 7) + '...' : 'NULL', '| matches admin1234:', match)
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
