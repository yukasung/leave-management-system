import { prisma } from '../lib/prisma.js';
async function main() {
  const rows = await prisma.leaveType.findMany({
    select: { name: true, maxDaysPerYear: true, maxDaysPerRequest: true, deductFromBalance: true },
    orderBy: { name: 'asc' }
  });
  rows.forEach(r => console.log(JSON.stringify(r)));

  console.log('\n--- LeaveBalance records with totalDays=0 ---');
  const badBalances = await prisma.leaveBalance.findMany({
    where: { totalDays: 0 },
    include: { leaveType: { select: { name: true, maxDaysPerYear: true } }, user: { select: { name: true } } },
    take: 20
  });
  badBalances.forEach(b => console.log(`  user=${b.user.name}, type=${b.leaveType.name}, maxPerYear=${b.leaveType.maxDaysPerYear}, totalDays=${b.totalDays}, usedDays=${b.usedDays}`));
  console.log(`Total bad records: ${badBalances.length}`);
  await prisma.$disconnect();
}
main().catch(console.error);
