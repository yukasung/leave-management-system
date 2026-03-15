/**
 * One-time cleanup: delete LeaveBalance records for leave types that have
 * maxDaysPerYear = null (special/one-time leave types like ลาคลอดบุตร,
 * ลาฌาปนกิจ, ลาทำหมัน, ลาแต่งงาน).
 *
 * These records were incorrectly created by the employee creation action
 * with totalDays = 0. They are meaningless since these leave types do not
 * have yearly quotas.
 */
import { prisma } from '../lib/prisma'

async function main() {
  // Find all leave types with no yearly quota
  const specialTypes = await prisma.leaveType.findMany({
    where: { maxDaysPerYear: null },
    select: { id: true, name: true },
  })

  if (specialTypes.length === 0) {
    console.log('No special leave types found.')
    return
  }

  console.log('Special leave types (maxDaysPerYear = null):')
  specialTypes.forEach((t) => console.log(`  - ${t.name} (${t.id})`))

  const specialTypeIds = specialTypes.map((t) => t.id)

  // Count how many balance records exist for these types
  const count = await prisma.leaveBalance.count({
    where: { leaveTypeId: { in: specialTypeIds } },
  })
  console.log(`\nFound ${count} LeaveBalance record(s) to delete.`)

  if (count === 0) {
    console.log('Nothing to do.')
    return
  }

  const deleted = await prisma.leaveBalance.deleteMany({
    where: { leaveTypeId: { in: specialTypeIds } },
  })

  console.log(`✅ Deleted ${deleted.count} LeaveBalance record(s).`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
