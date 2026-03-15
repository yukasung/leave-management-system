/**
 * Server-only leave policy helpers — do NOT import this in client components.
 * For shared types and display utilities, import from '@/lib/leave-policy-utils'.
 */
import 'server-only'

import { prisma } from './prisma'
import type { Prisma } from '@prisma/client'

// Re-export shared types so server modules can import from one place
export type { LeaveTypePolicy } from './leave-policy-utils'
export { buildPolicySummary } from './leave-policy-utils'

// ── Yearly usage query ────────────────────────────────────────────────────────

/**
 * Sum APPROVED leave days for a user + leave type in the current calendar year.
 * Accepts an optional Prisma transaction client so it can run inside a $transaction.
 */
export async function getUsedLeaveDaysThisYear(
  userId: string,
  leaveTypeId: string,
  tx?: Prisma.TransactionClient
): Promise<number> {
  const db = tx ?? prisma
  const year = new Date().getFullYear()
  const yearStart = new Date(year, 0, 1)
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)

  const result = await db.leaveRequest.aggregate({
    _sum: { totalDays: true },
    where: {
      userId,
      leaveTypeId,
      status: 'APPROVED',
      leaveStartDateTime: { gte: yearStart, lte: yearEnd },
    },
  })

  return result._sum?.totalDays ?? 0
}
