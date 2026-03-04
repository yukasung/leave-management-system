/**
 * Holiday Import Service
 *
 * Fetches financial-institution holidays from the
 * Bank of Thailand (ธปท.) Open API:
 *   GET https://gateway.api.bot.or.th/financial-institutions-holidays/?year=YYYY
 *
 * Authentication:
 *   Header: Authorization: <token>
 *   Token is stored in BOT_API_TOKEN in .env.local
 *
 * Response shape (actual):
 * {
 *   "result": {
 *     "api": "API_V2.FIHolidays",
 *     "timestamp": "2026-03-04 17:05:54",
 *     "data": [
 *       {
 *         "HolidayWeekDay":      "Thursday",
 *         "HolidayWeekDayThai":  "วันพฤหัสบดี",
 *         "Date":                "2026-01-01",
 *         "DateThai":            "01/01/2569",
 *         "HolidayDescription":  "New Year's Day",
 *         "HolidayDescriptionThai": "วันขึ้นปีใหม่"
 *       }
 *     ]
 *   }
 * }
 */

export interface PublicHoliday {
  date: Date;
  name: string;     // Thai name preferred, English fallback
  nameEn: string;   // English name
}

// ── Raw shape returned by BOT API ────────────────────────────────────────────

interface BotHolidayItem {
  Date:                   string;  // "YYYY-MM-DD"
  HolidayDescription:     string;  // English
  HolidayDescriptionThai: string;  // Thai
  HolidayWeekDay?:        string;
  HolidayWeekDayThai?:    string;
  DateThai?:              string;
}
// Actual response: { result: { api, timestamp, data: BotHolidayItem[] } }
interface BotApiResponse {
  result?: {
    api?:       string;
    timestamp?: string;
    data?:      BotHolidayItem[];
  };
}
// ── Config ───────────────────────────────────────────────────────────────────

const BOT_API_URL =
  "https://gateway.api.bot.or.th/financial-institutions-holidays/";

/**
 * Fetches Thailand financial-institution holidays for the given year
 * from the Bank of Thailand Open API.
 *
 * @param year  Calendar year, e.g. 2026
 * @returns     Array of { date, name, nameEn } — NOT yet persisted to the DB
 * @throws      Error if the network request fails or the API returns an error
 */
export async function fetchThailandPublicHolidays(
  year: number
): Promise<PublicHoliday[]> {
  const url = `${BOT_API_URL}?year=${year}`;
  const token = process.env.BOT_API_TOKEN ?? "";

  // ── Network call ────────────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetch(url, {
      cache: "no-store",
      headers: {
        accept:        "application/json",
        Authorization: token,
      },
    });
  } catch (networkError) {
    throw new Error(
      `ไม่สามารถเชื่อมต่อ BOT API (${url}): ${
        networkError instanceof Error
          ? networkError.message
          : String(networkError)
      }`
    );
  }

  // ── Auth error ───────────────────────────────────────────────────────────────
  if (response.status === 401) {
    throw new Error(
      "BOT API ตอบกลับ 401 Unauthorized — กรุณาตรวจสอบ BOT_API_TOKEN ใน .env.local"
    );
  }

  if (response.status === 204) {
    return [];
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `BOT API ตอบกลับสถานะ ${response.status} ${response.statusText} สำหรับปี ${year}` +
        (body ? `: ${body.slice(0, 200)}` : "")
    );
  }

  // ── Parse JSON ───────────────────────────────────────────────────────────────
  const text = await response.text();
  if (!text || text.trim() === "") return [];

  let parsed: BotApiResponse;
  try {
    parsed = JSON.parse(text) as BotApiResponse;
  } catch {
    throw new Error(
      `BOT API ส่งข้อมูลที่ไม่ใช่ JSON สำหรับปี ${year}: ${text.slice(0, 200)}`
    );
  }

  const items = parsed?.result?.data;

  if (!Array.isArray(items)) {
    return [];
  }

  // ── Map items ────────────────────────────────────────────────────────────────
  const holidays: PublicHoliday[] = [];

  for (const item of items) {
    // Date is "YYYY-MM-DD"
    const dateStr = item.Date ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) continue;

    const date = new Date(`${dateStr}T00:00:00.000Z`);
    if (isNaN(date.getTime())) continue;

    const nameTh = item.HolidayDescriptionThai?.trim() ?? "";
    const nameEn = item.HolidayDescription?.trim()     ?? "";
    const name   = nameTh || nameEn || dateStr;

    holidays.push({ date, name, nameEn });
  }

  return holidays;
}
