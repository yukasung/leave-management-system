import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchThailandPublicHolidays } from "@/lib/holiday-import.service";

/**
 * GET /api/admin/holidays/import-preview?year=2026
 *
 * Fetches holiday data from the Bank of Thailand API server-side and returns
 * a preview list without persisting anything to the database.
 *
 * Deployed on Railway ap-southeast-1 (Singapore) which can reach gateway.api.bot.or.th.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = parseInt(yearParam ?? "", 10);
  if (isNaN(year)) return NextResponse.json({ error: "Missing year" }, { status: 400 });

  let holidays;
  try {
    holidays = await fetchThailandPublicHolidays(year);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error while fetching holidays";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({
    year,
    total: holidays.length,
    warning:
      holidays.length === 0
        ? `ธนาคารแห่งประเทศไทย API ไม่มีข้อมูลวันหยุดสำหรับปี ${year} ` +
          `กรุณาตรวจสอบ BOT_API_KEY ใน Railway Variables หรือเพิ่มวันหยุดด้วยตนเอง`
        : undefined,
    holidays: holidays.map((h) => ({
      date: h.date.toISOString().slice(0, 10),
      name: h.name,
    })),
  });
}
