require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('../node_modules/@prisma/client');
const { PrismaPg } = require('../node_modules/@prisma/adapter-pg');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = process.argv[2] || 'ornnatthan.thipkaew@company.com';
  const year = new Date().getFullYear();

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true } });
  if (!user) { console.log('User not found:', email); return; }
  console.log('User:', user.name, user.id);

  const leaveTypes = await prisma.leaveType.findMany({
    where: { maxDaysPerYear: { not: null } },
    select: { id: true, name: true, maxDaysPerYear: true },
  });
  console.log('Leave types with quota:', leaveTypes.map(l => l.name));

  for (const lt of leaveTypes) {
    const result = await prisma.leaveBalance.upsert({
      where: { userId_leaveTypeId_year: { userId: user.id, leaveTypeId: lt.id, year } },
      update: {},
      create: { userId: user.id, leaveTypeId: lt.id, year, totalDays: lt.maxDaysPerYear ?? 0, usedDays: 0 },
    });
    console.log(`  ✓ ${lt.name}: ${result.totalDays} วัน`);
  }

  console.log('\nDone — leave balances created for', user.name);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e.message); process.exit(1); });
