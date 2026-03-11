require('dotenv').config({ path: require('path').join(__dirname, '../.env') })
const { PrismaClient } = require('../node_modules/@prisma/client')
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Check Chainarong's employee record
  const chainarong = await prisma.user.findUnique({
    where: { email: 'c.jaykeaw@gmail.com' },
    include: {
      employee: {
        include: {
          approvedFor: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  })
  console.log('Chainarong user id:', chainarong?.id)
  console.log('Chainarong employee id:', chainarong?.employee?.id)
  console.log('Chainarong isManager:', chainarong?.employee?.isManager)
  console.log('Chainarong approvedFor (employees he should approve):', chainarong?.employee?.approvedFor)

  // Check Ornnatthan's approvers
  const ornnatthan = await prisma.employee.findFirst({
    where: { email: 'ornnatthan.thipkaew@company.com' },
    include: {
      approvers: { select: { id: true, firstName: true, lastName: true } },
    },
  })
  console.log('\nOrnnatthan employee id:', ornnatthan?.id)
  console.log('Ornnatthan approvers:', ornnatthan?.approvers)

  // Check pending leave requests
  const pending = await prisma.leaveRequest.findMany({
    where: { status: 'PENDING' },
    include: {
      user: {
        include: {
          employee: {
            include: {
              approvers: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      leaveType: { select: { name: true } },
    },
  })
  console.log('\nPending leave requests:', pending.length)
  pending.forEach(r => {
    console.log(' -', r.user.email, '|', r.leaveType.name, '| approvers:', r.user.employee?.approvers?.map(a => a.firstName))
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
