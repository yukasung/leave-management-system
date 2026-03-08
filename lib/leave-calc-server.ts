/**
 * Server-side leave day calculation.
 *
 * This module is intentionally server-only: it reads CompanyHoliday rows from
 * the database before delegating to the pure `calculateLeaveDays` utility.
 *
 * Use this in Server Actions and API route handlers (never on the client).
 * Client components continue using the pure `calculateLeaveDays` for live
 * preview; the server always recalculates authoritatively here.
 */
import 'server-only'

import { prisma } from '@/lib/prisma'
import {
  calculateLeaveDays,
  type LeaveDurationType,
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
      // Use UTC methods — Prisma stores dates as UTC midnight, matching how
      // calculateLeaveDays builds its cursor with Date.UTC()
      return h.date.toISOString().slice(0, 10) // "YYYY-MM-DD" in UTC
    })
  )
}

/**
 * Authoritative server-side leave day calculation.
 *
 * Identical to `calculateLeaveDays` but also skips any date that exists in
 * the CompanyHoliday table (source = MANUAL or BOT).
 *
 * @param startDate           - Leave start date
 * @param endDate             - Leave end date
 * @param startDurationType   - Duration type for the first day
 * @param endDurationType     - Duration type for the last day (defaults to startDurationType)
 */
export async function calculateLeaveDaysServer(
  startDate: Date,
  endDate: Date,
  startDurationType: LeaveDurationType,
  endDurationType: LeaveDurationType = startDurationType
): Promise<CalculationResult> {
  const publicHolidays = await fetchHolidaySet(startDate, endDate)
  return calculateLeaveDays(startDate, endDate, startDurationType, endDurationType, publicHolidays)
}
