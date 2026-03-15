import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * GET /api/admin/holidays/import-preview?year=2026
 *
 * NOTE: This route is kept for backward compatibility but the client now
 * calls the BOT API directly from the browser to avoid server-side network
 * restrictions (Railway servers outside Thailand cannot reach BOT API).
 *
 * The route now simply returns an empty scaffold so old calls don't break.
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const yearParam = req.nextUrl.searchParams.get("year");
  const year = parseInt(yearParam ?? "", 10);
  if (isNaN(year)) return NextResponse.json({ error: "Missing year" }, { status: 400 });

  return NextResponse.json({ year, total: 0, holidays: [], clientSideFetch: true });
}

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
