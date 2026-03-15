import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mock nodemailer before importing mailer ───────────────────────────────────

const mockSendMail = vi.fn().mockResolvedValue({ messageId: 'test-id' })
const mockCreateTransport = vi.fn(() => ({ sendMail: mockSendMail }))

vi.mock('nodemailer', () => ({
  default: { createTransport: mockCreateTransport },
}))

// Import AFTER mocks
const {
  sendMail,
  buildLeaveApprovedEmail,
  buildLeaveRequestEmail,
} = await import('../mailer')

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** 2026-03-13 (CE) */
const START = new Date(2026, 2, 13)   // month is 0-indexed → March
/** 2026-03-15 (CE) */
const END   = new Date(2026, 2, 15)

const APPROVED_DATA = {
  employeeName:       'สมชาย ใจดี',
  leaveTypeName:      'ลาพักร้อน',
  totalDays:          3,
  leaveStartDateTime: START,
  leaveEndDateTime:   END,
  leaveRequestId:     'abc123def456',
}

const REQUEST_DATA = {
  employeeName:       'มานี มีดี',
  leaveTypeName:      'ลาป่วย',
  totalDays:          1,
  leaveStartDateTime: START,
  leaveEndDateTime:   START,
  reason:             'ไข้หวัด',
  leaveRequestId:     'xyz789uvw012',
}

// ── sendMail ──────────────────────────────────────────────────────────────────

describe('sendMail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls transporter.sendMail with correct fields', async () => {
    process.env.SMTP_FROM = 'noreply@test.com'

    await sendMail({ to: 'user@example.com', subject: 'Test', html: '<p>hi</p>' })

    expect(mockSendMail).toHaveBeenCalledTimes(1)
    const call = mockSendMail.mock.calls[0][0]
    expect(call.to).toBe('user@example.com')
    expect(call.subject).toBe('Test')
    expect(call.html).toBe('<p>hi</p>')
  })

  it('joins array recipients with comma', async () => {
    await sendMail({
      to: ['a@test.com', 'b@test.com'],
      subject: 'Hello',
      html: '<p>hi</p>',
    })

    const call = mockSendMail.mock.calls[0][0]
    expect(call.to).toBe('a@test.com, b@test.com')
  })

  it('passes optional text field through', async () => {
    await sendMail({ to: 'u@test.com', subject: 'S', html: '<p/>', text: 'plain' })
    expect(mockSendMail.mock.calls[0][0].text).toBe('plain')
  })
})

// ── buildLeaveApprovedEmail ───────────────────────────────────────────────────

describe('buildLeaveApprovedEmail', () => {
  afterEach(() => {
    delete process.env.NEXTAUTH_URL
  })

  it('subject contains leave type and day count', () => {
    const { subject } = buildLeaveApprovedEmail(APPROVED_DATA)
    expect(subject).toContain('ลาพักร้อน')
    expect(subject).toContain('3')
    expect(subject).toContain('[อนุมัติแล้ว]')
  })

  it('html contains employee name', () => {
    const { html } = buildLeaveApprovedEmail(APPROVED_DATA)
    expect(html).toContain('สมชาย ใจดี')
  })

  it('html contains leave type name', () => {
    const { html } = buildLeaveApprovedEmail(APPROVED_DATA)
    expect(html).toContain('ลาพักร้อน')
  })

  it('html shows BE year (2026 + 543 = 2569)', () => {
    const { html } = buildLeaveApprovedEmail(APPROVED_DATA)
    expect(html).toContain('2569')
  })

  it('html contains Thai month name for March (มีนาคม)', () => {
    const { html } = buildLeaveApprovedEmail(APPROVED_DATA)
    expect(html).toContain('มีนาคม')
  })

  it('html contains detail link using NEXTAUTH_URL', () => {
    process.env.NEXTAUTH_URL = 'https://app.example.com'
    const { html } = buildLeaveApprovedEmail(APPROVED_DATA)
    expect(html).toContain('https://app.example.com/en/leave-request/abc123def456/edit')
  })

  it('html falls back to localhost when NEXTAUTH_URL is not set', () => {
    delete process.env.NEXTAUTH_URL
    const { html } = buildLeaveApprovedEmail(APPROVED_DATA)
    expect(html).toContain('http://localhost:3000/en/leave-request/abc123def456/edit')
  })

  it('html footer shows first 8 chars of leaveRequestId', () => {
    const { html } = buildLeaveApprovedEmail(APPROVED_DATA)
    expect(html).toContain('abc123de')
  })

  it('text contains leave type, day count and detail url', () => {
    const { text } = buildLeaveApprovedEmail(APPROVED_DATA)
    expect(text).toContain('ลาพักร้อน')
    expect(text).toContain('3 วัน')
  })

  it('formats decimal totalDays correctly (0.5 → "0.5")', () => {
    const { subject } = buildLeaveApprovedEmail({ ...APPROVED_DATA, totalDays: 0.5 })
    expect(subject).toContain('0.5')
  })

  it('formats integer totalDays without decimal (1 → "1" not "1.00")', () => {
    const { subject } = buildLeaveApprovedEmail({ ...APPROVED_DATA, totalDays: 1 })
    expect(subject).not.toContain('1.00')
    expect(subject).toContain('1')
  })
})

// ── buildLeaveRequestEmail ────────────────────────────────────────────────────

describe('buildLeaveRequestEmail', () => {
  afterEach(() => {
    delete process.env.NEXTAUTH_URL
  })

  it('subject contains employee name, leave type, and day count', () => {
    const { subject } = buildLeaveRequestEmail(REQUEST_DATA)
    expect(subject).toContain('มานี มีดี')
    expect(subject).toContain('ลาป่วย')
    expect(subject).toContain('1')
    expect(subject).toContain('[คำขอลา]')
  })

  it('html contains employee name', () => {
    const { html } = buildLeaveRequestEmail(REQUEST_DATA)
    expect(html).toContain('มานี มีดี')
  })

  it('html contains reason when provided', () => {
    const { html } = buildLeaveRequestEmail(REQUEST_DATA)
    expect(html).toContain('ไข้หวัด')
  })

  it('html does NOT render reason row when reason is null', () => {
    const { html } = buildLeaveRequestEmail({ ...REQUEST_DATA, reason: null })
    expect(html).not.toContain('เหตุผล')
  })

  it('html does NOT render reason row when reason is undefined', () => {
    const { html } = buildLeaveRequestEmail({ ...REQUEST_DATA, reason: undefined })
    expect(html).not.toContain('เหตุผล')
  })

  it('html shows BE year', () => {
    const { html } = buildLeaveRequestEmail(REQUEST_DATA)
    expect(html).toContain('2569')
  })

  it('html contains review link', () => {
    process.env.NEXTAUTH_URL = 'https://hr.company.com'
    const { html } = buildLeaveRequestEmail(REQUEST_DATA)
    expect(html).toContain('https://hr.company.com/en/leave-request/xyz789uvw012/edit')
  })

  it('text includes reason when provided', () => {
    const { text } = buildLeaveRequestEmail(REQUEST_DATA)
    expect(text).toContain('ไข้หวัด')
  })

  it('text does NOT include reason line when reason is null', () => {
    const { text } = buildLeaveRequestEmail({ ...REQUEST_DATA, reason: null })
    expect(text).not.toContain('เหตุผล:')
  })

  it('html footer shows first 8 chars of leaveRequestId', () => {
    const { html } = buildLeaveRequestEmail(REQUEST_DATA)
    expect(html).toContain('xyz789uv')
  })

  it('formats decimal days correctly (1.5 → "1.5")', () => {
    const { subject } = buildLeaveRequestEmail({ ...REQUEST_DATA, totalDays: 1.5 })
    expect(subject).toContain('1.5')
  })
})
