import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  // ── Employee data from the table ──────────────────────────────────────────
  const employees = [
    // Legal
    { employeeCode: '0009', firstName: 'Paitong',    lastName: 'Rakpeon',           email: 'paitong.rakpeon@company.com',           department: 'Legal',                position: 'Associate' },
    { employeeCode: '0015', firstName: 'Chamainat',  lastName: 'Permsri',            email: 'chamainat.permsri@company.com',          department: 'Legal',                position: 'Associate' },
    { employeeCode: '0014', firstName: 'Kulkallaya', lastName: 'Kanokpornvasin',     email: 'kulkallaya.kanokpornvasin@company.com',  department: 'Legal',                position: 'Associate' },
    { employeeCode: '0016', firstName: 'Weraphon',   lastName: 'Suphaphonrangsan',   email: 'weraphon.suphaphonrangsan@company.com',  department: 'Legal',                position: 'Associate' },
    // Business Development
    { employeeCode: '0006', firstName: 'Pichamon',   lastName: 'Puapitsirikul',      email: 'pichamon.puapitsirikul@company.com',     department: 'Business Development', position: 'Business Development Associate' },
    { employeeCode: '0010', firstName: 'Chattapong', lastName: 'Rujjanawate',        email: 'chattapong.rujjanawate@company.com',     department: 'Business Development', position: 'Digital Marketing & Graphic Design' },
    // Accounting & Admin
    { employeeCode: '0007', firstName: 'Ornnatthan', lastName: 'Thipkaew',           email: 'ornnatthan.thipkaew@company.com',        department: 'Accounting & Admin',   position: 'Accounting & Admin Officer' },
  ]

  for (const emp of employees) {
    // Find department
    const dept = await prisma.department.findFirst({
      where: { name: emp.department },
      select: { id: true },
    })

    if (!dept) {
      console.warn(`⚠️  Department not found: ${emp.department} — creating it`)
      await prisma.department.create({ data: { name: emp.department } })
    }

    const deptId = dept?.id ?? (
      await prisma.department.findFirst({ where: { name: emp.department }, select: { id: true } })
    )?.id ?? null

    await prisma.employee.upsert({
      where: { employeeCode: emp.employeeCode },
      update: {
        firstName:    emp.firstName,
        lastName:     emp.lastName,
        email:        emp.email,
        position:     emp.position,
        departmentId: deptId,
      },
      create: {
        employeeCode: emp.employeeCode,
        firstName:    emp.firstName,
        lastName:     emp.lastName,
        email:        emp.email,
        position:     emp.position,
        isProbation:  false,
        isActive:     true,
        departmentId: deptId,
      },
    })

    console.log(`✅ ${emp.employeeCode} — ${emp.firstName} ${emp.lastName} (${emp.department})`)
  }

  console.log('\n🎉 Employee seed completed')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
