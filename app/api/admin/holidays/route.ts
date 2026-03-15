import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HolidaySource } from "@prisma/client";

function guard(isAdmin: boolean) {
  return !isAdmin
}

// ── GET /api/admin/holidays?year=2026 ───────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (guard(session.user.isAdmin))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

  if (isNaN(year))
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });

  const holidays = await prisma.companyHoliday.findMany({
    where: { year },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({
    year,
    total: holidays.length,
    holidays: holidays.map((h) => ({
      id:     h.id,
      date:   h.date.toISOString().slice(0, 10),
      name:   h.name,
      source: h.source,
    })),
  });
}

// ── POST /api/admin/holidays ──────────────────────────────────────────────────
// Body: { date: "YYYY-MM-DD", name: string }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (guard(session.user.isAdmin))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const dateStr = typeof raw?.date === "string" ? raw.date.trim() : "";
  const name    = typeof raw?.name === "string" ? raw.name.trim() : "";

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr))
    return NextResponse.json({ error: "date must be in YYYY-MM-DD format" }, { status: 400 });
  if (!name)
    return NextResponse.json({ error: "name is required" }, { status: 400 });

  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(date.getTime()))
    return NextResponse.json({ error: "Invalid date value" }, { status: 400 });

  const year = date.getUTCFullYear();

  // Check duplicate
  const existing = await prisma.companyHoliday.findFirst({ where: { date } });
  if (existing)
    return NextResponse.json(
      { error: `วันที่ ${dateStr} มีอยู่ในระบบแล้ว (${existing.name})` },
      { status: 409 }
    );

  const holiday = await prisma.companyHoliday.create({
    data: { date, name, year, source: HolidaySource.MANUAL },
  });

  return NextResponse.json(
    {
      id:     holiday.id,
      date:   holiday.date.toISOString().slice(0, 10),
      name:   holiday.name,
      source: holiday.source,
    },
    { status: 201 }
  );
}
