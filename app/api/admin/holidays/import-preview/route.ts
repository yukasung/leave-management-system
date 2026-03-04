import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchThailandPublicHolidays } from "@/lib/holiday-import.service";

/**
 * GET /api/admin/holidays/import-preview?year=2026
 *
 * Returns Thailand financial-institution holidays from the Bank of Thailand API for the given year.
 * Does NOT write anything to the database.
 *
 * Access: ADMIN and HR only.
 */
export async function GET(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "HR") {
    return NextResponse.json(
      { error: "Forbidden — only ADMIN or HR may access this endpoint" },
      { status: 403 }
    );
  }

  // ── Query param ───────────────────────────────────────────────────────────
  const yearParam = req.nextUrl.searchParams.get("year");

  if (!yearParam) {
    return NextResponse.json(
      { error: "Missing required query parameter: year" },
      { status: 400 }
    );
  }

  const year = parseInt(yearParam, 10);

  if (isNaN(year) || year < 1900 || year > 2100) {
    return NextResponse.json(
      { error: `Invalid year value: "${yearParam}". Must be a number between 1900 and 2100.` },
      { status: 400 }
    );
  }

  // ── Fetch ─────────────────────────────────────────────────────────────────
  let holidays;
  try {
    holidays = await fetchThailandPublicHolidays(year);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error while fetching holidays";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }

  // ── Response ──────────────────────────────────────────────────────────────
  return NextResponse.json({
    year,
    total: holidays.length,    warning:
      holidays.length === 0
        ? `ธนาคารแห่งประเทศไทย API ไม่มีข้อมูลวันหยุดสำหรับปี ${year} ` +
          `กรุณาตรวจสอบ BOT_API_KEY ใน .env.local หรือเพิ่มวันหยุดด้วยตนเอง`
        : undefined,    holidays: holidays.map((h) => ({
      date: h.date.toISOString().slice(0, 10), // "YYYY-MM-DD"
      name: h.name,
    })),
  });
}
