require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Find Chainarong's employee id
  const chainarong = await prisma.employee.findFirst({
    where: { email: 'c.jaykeaw@gmail.com' },
    select: { id: true, firstName: true, lastName: true },
  })
  if (!chainarong) { console.log('Chainarong not found'); return }

  // Find Ornnatthan's employee id
  const ornnatthan = await prisma.employee.findFirst({
    where: { email: 'ornnatthan.thipkaew@company.com' },
    select: { id: true, firstName: true, lastName: true },
  })
  if (!ornnatthan) { console.log('Ornnatthan not found'); return }

  // Set Chainarong as approver for Ornnatthan
  await prisma.employee.update({
    where: { id: ornnatthan.id },
    data: { approvers: { connect: { id: chainarong.id } } },
  })

  console.log(`Set ${chainarong.firstName} as approver for ${ornnatthan.firstName}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
