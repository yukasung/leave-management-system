import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fetchThailandPublicHolidays } from "@/lib/holiday-import.service";
import { HolidaySource } from "@prisma/client";

/**
 * POST /api/admin/holidays/import
 *
 * Body: { year: number, mode?: 'upsert' | 'replace' }
 *
 * mode = 'upsert'  (default) — insert missing dates, update name of existing BOT entries
 * mode = 'replace'            — delete all BOT-sourced entries for the year, then insert fresh
 *
 * Fetches Thailand financial-institution holidays from the Bank of Thailand API and inserts
 * any dates not already present in the CompanyHoliday table.
 *
 * Access: ADMIN and HR only.
 *
 * Returns:
 *   { year, mode, totalFetched, totalInserted, totalUpdated, totalSkipped }
 */
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.isAdmin;
  if (!role) {
    return NextResponse.json(
      { error: "Forbidden — only Admin may access this endpoint" },
      { status: 403 }
    );
  }

  // ── Body ──────────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;
  const year = raw?.year;
  const mode = (raw?.mode as string | undefined) ?? "upsert";

  if (typeof year !== "number" || !Number.isInteger(year) || year < 1900 || year > 2100) {
    return NextResponse.json(
      { error: "Body must include a valid integer 'year' between 1900 and 2100" },
      { status: 400 }
    );
  }

  if (mode !== "upsert" && mode !== "replace") {
    return NextResponse.json(
      { error: "mode must be 'upsert' or 'replace'" },
      { status: 400 }
    );
  }

  // ── Fetch holidays: accept client-provided array OR fetch from BOT API ────
  // Client provides holidays[] when importing from CSV/Excel (BOT API is geo-restricted).
  interface HolidayInput { date: string; name: string; nameEn?: string }
  let fetched: Array<{ date: Date; name: string; nameEn: string }>;

  const clientHolidays = raw?.holidays as HolidayInput[] | undefined;

  if (Array.isArray(clientHolidays) && clientHolidays.length > 0) {
    fetched = clientHolidays
      .filter((h) => typeof h.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(h.date))
      .map((h) => ({
        date: new Date(`${h.date}T00:00:00.000Z`),
        name: h.name || h.date,
        nameEn: h.nameEn || h.name || h.date,
      }));
  } else {
    // Server-side fetch from BOT API (works only when server can reach gateway.api.bot.or.th)
    try {
      fetched = await fetchThailandPublicHolidays(year);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error while fetching holidays";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  if (fetched.length === 0) {
    return NextResponse.json({
      year,
      mode,
      totalFetched: 0,
      totalInserted: 0,
      totalUpdated: 0,
      totalSkipped: 0,
    });
  }

  // ── Apply import mode ─────────────────────────────────────────────────────
  let totalInserted = 0;
  let totalUpdated  = 0;
  let totalSkipped  = 0;

  const yearStart = new Date(`${year}-01-01T00:00:00.000Z`);
  const yearEnd   = new Date(`${year}-12-31T23:59:59.999Z`);

  if (mode === "replace") {
    // Delete all BOT-sourced holidays for this year, then insert fresh
    await prisma.companyHoliday.deleteMany({
      where: {
        source: HolidaySource.BOT,
        date: { gte: yearStart, lte: yearEnd },
      },
    });

    const result = await prisma.companyHoliday.createMany({
      data: fetched.map((h) => ({
        date:   h.date,
        name:   h.name,
        year,
        source: HolidaySource.BOT,
      })),
      skipDuplicates: true,
    });

    totalInserted = result.count;
  } else {
    // Upsert — insert new dates, update name of existing BOT entries
    // (MANUAL entries are never touched)
    const existingRows = await prisma.companyHoliday.findMany({
      where: { date: { gte: yearStart, lte: yearEnd } },
      select: { id: true, date: true, source: true, name: true },
    });

    const existingMap = new Map(
      existingRows.map((h) => [h.date.toISOString().slice(0, 10), h])
    );

    for (const h of fetched) {
      const key = h.date.toISOString().slice(0, 10);
      const row = existingMap.get(key);

      if (!row) {
        await prisma.companyHoliday.create({
          data: { date: h.date, name: h.name, year, source: HolidaySource.BOT },
        });
        totalInserted++;
      } else if (row.source === HolidaySource.BOT && row.name !== h.name) {
        // Update BOT entry whose name changed
        await prisma.companyHoliday.update({
          where: { id: row.id },
          data:  { name: h.name },
        });
        totalUpdated++;
      } else {
        // Already up-to-date, or MANUAL entry on same date — leave untouched
        totalSkipped++;
      }
    }
  }

  // ── Response ──────────────────────────────────────────────────────────────
  return NextResponse.json({
    year,
    mode,
    totalFetched:  fetched.length,
    totalInserted,
    totalUpdated,
    totalSkipped,
  });
}
