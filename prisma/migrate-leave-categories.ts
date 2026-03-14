/**
 * Data migration: assign leaveCategory, leaveLimitType, and dayCountType
 * to existing leave types based on the new requirements.
 */
import { prisma } from '../lib/prisma'

const MIGRATIONS: Array<{
  name: string
  leaveCategory: 'ANNUAL' | 'EVENT'
  leaveLimitType: 'PER_YEAR' | 'PER_EVENT' | 'MEDICAL_BASED'
  dayCountType: 'WORKING_DAY' | 'CALENDAR_DAY'
}> = [
  // ── Annual Leave ──────────────────────────────────────────────────────────
  { name: 'ลาป่วย',          leaveCategory: 'ANNUAL', leaveLimitType: 'PER_YEAR',      dayCountType: 'WORKING_DAY' },
  { name: 'ลากิจส่วนตัว',    leaveCategory: 'ANNUAL', leaveLimitType: 'PER_YEAR',      dayCountType: 'WORKING_DAY' },
  { name: 'ลาพักร้อน',       leaveCategory: 'ANNUAL', leaveLimitType: 'PER_YEAR',      dayCountType: 'WORKING_DAY' },
  { name: 'ลาพัฒนาความรู้',  leaveCategory: 'ANNUAL', leaveLimitType: 'PER_YEAR',      dayCountType: 'WORKING_DAY' },
  // ── Event Leave ───────────────────────────────────────────────────────────
  { name: 'ลาแต่งงาน',       leaveCategory: 'EVENT',  leaveLimitType: 'PER_EVENT',     dayCountType: 'WORKING_DAY' },
  { name: 'ลาฌาปนกิจ',       leaveCategory: 'EVENT',  leaveLimitType: 'PER_EVENT',     dayCountType: 'WORKING_DAY' },
  { name: 'ลาอุปสมบท',       leaveCategory: 'EVENT',  leaveLimitType: 'PER_EVENT',     dayCountType: 'WORKING_DAY' },
  { name: 'ลาคลอดบุตร',      leaveCategory: 'EVENT',  leaveLimitType: 'PER_EVENT',     dayCountType: 'CALENDAR_DAY' },
  { name: 'ลาทำหมัน',        leaveCategory: 'EVENT',  leaveLimitType: 'MEDICAL_BASED', dayCountType: 'WORKING_DAY' },
]

async function main() {
  console.log('Migrating leave type categories...\n')
  for (const m of MIGRATIONS) {
    const updated = await prisma.leaveType.updateMany({
      where: { name: m.name },
      data: {
        leaveCategory:  m.leaveCategory,
        leaveLimitType: m.leaveLimitType,
        dayCountType:   m.dayCountType,
      },
    })
    const status = updated.count > 0 ? '✅' : '⚠️  not found'
    console.log(`${status}  ${m.name}  →  ${m.leaveCategory} / ${m.leaveLimitType} / ${m.dayCountType}`)
  }
  console.log('\nDone.')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
