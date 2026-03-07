const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

async function main() {
  const emp = await p.employee.findFirst({ select: { id: true, managerId: true, manager: { select: { id: true, firstName: true } } } })
  console.log('Employee:', JSON.stringify(emp, null, 2))
}

main().then(() => p.$disconnect()).catch(e => { console.error('ERROR:', e.message); p.$disconnect() })
