/**
 * Server-side leave duration calculation.
 *
 * This module is intentionally server-only: it reads CompanyHoliday rows from
 * the database before delegating to the pure `calculateLeaveDuration` utility.
 *
 * Use this in Server Actions and API route handlers (never on the client).
 * Client components continue using the pure `calculateLeaveDuration` for live
 * preview; the server always recalculates authoritatively here.
 */
import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  calculateLeaveDuration,
  type CalculationResult,
} from '@/lib/leave-calc'

/**
 * Fetch all CompanyHoliday dates that fall within [startDate, endDate] and
 * return them as a Set of "YYYY-MM-DD" strings.
 */
async function fetchHolidaySet(startDate: Date, endDate: Date): Promise<Set<string>> {
  const holidays = await prisma.companyHoliday.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { date: true },
  })

  return new Set(
    holidays.map((h) => {
      return h.date.toISOString().slice(0, 10) // "YYYY-MM-DD" in UTC
    })
  )
}

/**
 * Authoritative server-side leave duration calculation.
 *
 * Identical to `calculateLeaveDuration` but also skips any date that exists
 * in the CompanyHoliday table (source = MANUAL or BOT).
 *
 * @param startDT  - Leave start datetime
 * @param endDT    - Leave end datetime
 */
export async function calculateLeaveDurationServer(
  startDT: Date,
  endDT: Date
): Promise<CalculationResult> {
  const publicHolidays = await fetchHolidaySet(startDT, endDT)
  return calculateLeaveDuration(startDT, endDT, publicHolidays)
}

