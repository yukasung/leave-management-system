/**
 * One-time migration: populate the Position table from existing employee.position text values
 * and link each employee to its Position record via positionId.
 *
 * Run with:  npx tsx prisma/seed-positions.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // 1. Read all employees with their current position text + departmentId
  const employees = await prisma.employee.findMany({
    select: { id: true, position: true, departmentId: true },
  })

  // 2. Collect distinct position names
  const distinct = [...new Set(employees.map((e) => e.position).filter(Boolean))]

  console.log(`Found ${distinct.length} distinct positions:`, distinct)

  // 3. Upsert each into Position table (without departmentId for now — generic positions)
  for (const name of distinct) {
    await prisma.position.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  // 4. For each employee, find their Position record and set positionId
  const positionMap = await prisma.position.findMany({ select: { id: true, name: true } })
  const byName: Record<string, string> = Object.fromEntries(positionMap.map((p) => [p.name, p.id]))

  let updated = 0
  for (const emp of employees) {
    const posId = byName[emp.position]
    if (posId) {
      await prisma.employee.update({
        where: { id: emp.id },
        data: { positionId: posId },
      })
      updated++
    }
  }

  console.log(`✅ Linked ${updated} employees to their Position records`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
