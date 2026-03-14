/**
 * Seed LeaveCategoryConfig and link existing LeaveType records.
 * Run: npx tsx prisma/seed-categories.ts
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ── 1. Remove old categories not in the new list ──────────────────────────
  const keepKeys = ['annual', 'special']
  await prisma.leaveType.updateMany({
    where: { leaveCategory: { key: { notIn: keepKeys } } },
    data: { leaveCategoryId: null },
  })
  await prisma.leaveCategoryConfig.deleteMany({
    where: { key: { notIn: keepKeys } },
  })

  // ── 2. Upsert categories ──────────────────────────────────────────────────
  const categories = [
    { key: 'annual',  name: 'ลาประจำปี', color: 'blue',  sortOrder: 1 },
    { key: 'special', name: 'ลาพิเศษ',   color: 'pink',  sortOrder: 2 },
  ]

  const catMap: Record<string, string> = {}
  for (const cat of categories) {
    const record = await prisma.leaveCategoryConfig.upsert({
      where: { key: cat.key },
      update: { name: cat.name, color: cat.color, sortOrder: cat.sortOrder },
      create: cat,
    })
    catMap[cat.key] = record.id
    console.log(`✓ Category: ${cat.name} (${record.id})`)
  }

  // ── 3. Map leave type names → category key ────────────────────────────────
  const typeToCategory: Record<string, string> = {
    'ลาป่วย':          'annual',
    'ลากิจส่วนตัว':    'annual',
    'ลาพักร้อน':       'annual',
    'ลาฌาปนกิจ':       'special',
    'ลาแต่งงาน':       'special',
    'ลาอุปสมบท':       'special',
    'ลาคลอดบุตร':      'special',
    'ลาทำหมัน':        'special',
    'ลาพัฒนาความรู้':  'special',
  }

  // ── 4. Assign categories to leave types ───────────────────────────────────
  const leaveTypes = await prisma.leaveType.findMany({ select: { id: true, name: true } })
  for (const lt of leaveTypes) {
    const catKey = typeToCategory[lt.name]
    if (!catKey) {
      console.warn(`⚠  No category mapping for leave type: "${lt.name}" — skipped`)
      continue
    }
    await prisma.leaveType.update({
      where: { id: lt.id },
      data: { leaveCategoryId: catMap[catKey] },
    })
    console.log(`✓ Linked "${lt.name}" → ${categories.find(c => c.key === catKey)?.name}`)
  }

  console.log('\n✅ Category seed complete.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
