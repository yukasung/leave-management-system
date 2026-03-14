import { prisma } from './prisma'
import type { RoleName } from '@prisma/client'

const DEFAULT_ROLES: Array<{ name: RoleName; description: string }> = [
  { name: 'ADMIN',    description: 'ผู้ดูแลระบบ' },
  { name: 'HR',       description: 'HR / บุคคล'  },
  { name: 'MANAGER',  description: 'ผู้จัดการ'   },
  { name: 'EMPLOYEE', description: 'พนักงาน'     },
]

/**
 * Ensures all default roles exist in the database.
 * Safe to call multiple times — uses upsert, so no duplicates are created.
 * Short-circuits if the role count already matches so the normal hot-path
 * incurs only a single COUNT query.
 */
export async function seedRoles(): Promise<void> {
  const count = await prisma.role.count()
  if (count >= DEFAULT_ROLES.length) return

  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where:  { name: role.name },
      update: {},
      create: role,
    })
  }
}
