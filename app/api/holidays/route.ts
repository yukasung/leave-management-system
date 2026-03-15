import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/holidays?year=2026
 *
 * Public (any authenticated user) endpoint that returns company holidays for a
 * given year.  Used by the client-side HolidayDatePicker to highlight holidays.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (isNaN(year))
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });

  const holidays = await prisma.companyHoliday.findMany({
    where: { year },
    orderBy: { date: "asc" },
    select: { date: true, name: true },
  });

  return NextResponse.json({
    year,
    holidays: holidays.map((h) => ({
      date: h.date.toISOString().slice(0, 10),
      name: h.name,
    })),
  });
}
