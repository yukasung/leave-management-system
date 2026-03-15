import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchThailandPublicHolidays } from '../holiday-import.service'

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown, ok = status >= 200 && status < 300) {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status,
      ok,
      statusText: status === 401 ? 'Unauthorized' : status === 204 ? 'No Content' : 'OK',
      text: () => Promise.resolve(text),
    })
  )
}

function botPayload(items: object[]) {
  return {
    result: {
      api: 'API_V2.FIHolidays',
      timestamp: '2026-01-01 00:00:00',
      data: items,
    },
  }
}

const ITEM_2026 = {
  Date: '2026-01-01',
  HolidayDescription: "New Year's Day",
  HolidayDescriptionThai: 'วันขึ้นปีใหม่',
  HolidayWeekDay: 'Thursday',
  HolidayWeekDayThai: 'วันพฤหัสบดี',
  DateThai: '01/01/2569',
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.stubEnv('BOT_API_TOKEN', 'test-token')
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

// ── Network / HTTP errors ─────────────────────────────────────────────────────

describe('fetchThailandPublicHolidays — HTTP errors', () => {
  it('throws on network failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')))
    await expect(fetchThailandPublicHolidays(2026)).rejects.toThrow('ไม่สามารถเชื่อมต่อ BOT API')
  })

  it('throws a 401 error with a meaningful message', async () => {
    mockFetch(401, '', false)
    await expect(fetchThailandPublicHolidays(2026)).rejects.toThrow('401 Unauthorized')
  })

  it('returns empty array on 204 No Content', async () => {
    mockFetch(204, '', false)
    const result = await fetchThailandPublicHolidays(2026)
    expect(result).toEqual([])
  })

  it('throws on non-2xx status other than 204', async () => {
    mockFetch(500, 'Internal Server Error', false)
    await expect(fetchThailandPublicHolidays(2026)).rejects.toThrow('500')
  })
})

// ── Body parsing ──────────────────────────────────────────────────────────────

describe('fetchThailandPublicHolidays — body parsing', () => {
  it('returns empty array on empty body', async () => {
    mockFetch(200, '')
    const result = await fetchThailandPublicHolidays(2026)
    expect(result).toEqual([])
  })

  it('throws on malformed (non-JSON) body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        statusText: 'OK',
        text: () => Promise.resolve('not json {{{'),
      })
    )
    await expect(fetchThailandPublicHolidays(2026)).rejects.toThrow('ไม่ใช่ JSON')
  })

  it('returns empty array when result.data is missing', async () => {
    mockFetch(200, { result: {} })
    expect(await fetchThailandPublicHolidays(2026)).toEqual([])
  })

  it('returns empty array when result.data is not an array', async () => {
    mockFetch(200, { result: { data: null } })
    expect(await fetchThailandPublicHolidays(2026)).toEqual([])
  })

  it('returns empty array when result wrapper is missing entirely', async () => {
    mockFetch(200, {})
    expect(await fetchThailandPublicHolidays(2026)).toEqual([])
  })
})

// ── Successful mapping ────────────────────────────────────────────────────────

describe('fetchThailandPublicHolidays — mapping', () => {
  it('maps a valid item to PublicHoliday correctly', async () => {
    mockFetch(200, botPayload([ITEM_2026]))
    const result = await fetchThailandPublicHolidays(2026)

    expect(result).toHaveLength(1)
    const h = result[0]
    expect(h.name).toBe('วันขึ้นปีใหม่')
    expect(h.nameEn).toBe("New Year's Day")
    expect(h.date).toEqual(new Date('2026-01-01T00:00:00.000Z'))
  })

  it('falls back to English name when Thai name is empty', async () => {
    mockFetch(200, botPayload([{ ...ITEM_2026, HolidayDescriptionThai: '' }]))
    const result = await fetchThailandPublicHolidays(2026)
    expect(result[0].name).toBe("New Year's Day")
  })

  it('uses date string as name when both names are empty', async () => {
    mockFetch(200, botPayload([{ ...ITEM_2026, HolidayDescriptionThai: '', HolidayDescription: '' }]))
    const result = await fetchThailandPublicHolidays(2026)
    expect(result[0].name).toBe('2026-01-01')
  })

  it('skips items with an invalid date format', async () => {
    const bad = { ...ITEM_2026, Date: '01-01-2026' }   // wrong format
    mockFetch(200, botPayload([bad, ITEM_2026]))
    const result = await fetchThailandPublicHolidays(2026)
    expect(result).toHaveLength(1)                      // bad item skipped
  })

  it('skips items with a missing Date field', async () => {
    const { Date: _, ...noDate } = ITEM_2026
    mockFetch(200, botPayload([noDate]))
    expect(await fetchThailandPublicHolidays(2026)).toHaveLength(0)
  })

  it('maps multiple items correctly', async () => {
    const item2 = { ...ITEM_2026, Date: '2026-04-06', HolidayDescriptionThai: 'วันจักรี', HolidayDescription: 'Chakri Day' }
    mockFetch(200, botPayload([ITEM_2026, item2]))
    const result = await fetchThailandPublicHolidays(2026)
    expect(result).toHaveLength(2)
    expect(result[1].name).toBe('วันจักรี')
    expect(result[1].date).toEqual(new Date('2026-04-06T00:00:00.000Z'))
  })

  it('trims whitespace from names', async () => {
    const spaced = { ...ITEM_2026, HolidayDescriptionThai: '  วันขึ้นปีใหม่  ' }
    mockFetch(200, botPayload([spaced]))
    expect((await fetchThailandPublicHolidays(2026))[0].name).toBe('วันขึ้นปีใหม่')
  })
})

// ── Request details ───────────────────────────────────────────────────────────

describe('fetchThailandPublicHolidays — request', () => {
  it('calls the BOT API URL with the correct year', async () => {
    const spy = vi.fn().mockResolvedValue({
      status: 200, ok: true, statusText: 'OK',
      text: () => Promise.resolve(JSON.stringify(botPayload([]))),
    })
    vi.stubGlobal('fetch', spy)

    await fetchThailandPublicHolidays(2026)

    expect(spy).toHaveBeenCalledOnce()
    const [url] = spy.mock.calls[0]
    expect(url).toContain('year=2026')
    expect(url).toContain('gateway.api.bot.or.th')
  })

  it('sends Authorization header with the token from env', async () => {
    const spy = vi.fn().mockResolvedValue({
      status: 200, ok: true, statusText: 'OK',
      text: () => Promise.resolve(JSON.stringify(botPayload([]))),
    })
    vi.stubGlobal('fetch', spy)

    await fetchThailandPublicHolidays(2026)

    const [, opts] = spy.mock.calls[0]
    expect((opts as RequestInit).headers).toMatchObject({ Authorization: 'test-token' })
  })
})
