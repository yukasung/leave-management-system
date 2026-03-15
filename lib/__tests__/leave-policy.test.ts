import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock server-only (not a real module boundary in tests) ────────────────────
vi.mock('server-only', () => ({}))

// ── Mock Prisma ───────────────────────────────────────────────────────────────
const mockAggregate = vi.fn()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    leaveRequest: {
      aggregate: mockAggregate,
    },
  },
}))

// Import AFTER mocks are in place
const { getUsedLeaveDaysThisYear } = await import('../leave-policy')

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getUsedLeaveDaysThisYear', () => {
  const USER_ID  = 'user-123'
  const TYPE_ID  = 'type-abc'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the summed totalDays from approved leave requests', async () => {
    mockAggregate.mockResolvedValue({ _sum: { totalDays: 8 } })

    const result = await getUsedLeaveDaysThisYear(USER_ID, TYPE_ID)

    expect(result).toBe(8)
  })

  it('returns 0 when there are no approved requests (_sum.totalDays is null)', async () => {
    mockAggregate.mockResolvedValue({ _sum: { totalDays: null } })

    expect(await getUsedLeaveDaysThisYear(USER_ID, TYPE_ID)).toBe(0)
  })

  it('returns 0 when aggregate returns 0', async () => {
    mockAggregate.mockResolvedValue({ _sum: { totalDays: 0 } })

    expect(await getUsedLeaveDaysThisYear(USER_ID, TYPE_ID)).toBe(0)
  })

  it('queries with the correct userId and leaveTypeId', async () => {
    mockAggregate.mockResolvedValue({ _sum: { totalDays: 3 } })

    await getUsedLeaveDaysThisYear(USER_ID, TYPE_ID)

    const call = mockAggregate.mock.calls[0][0]
    expect(call.where.userId).toBe(USER_ID)
    expect(call.where.leaveTypeId).toBe(TYPE_ID)
  })

  it('queries only APPROVED status', async () => {
    mockAggregate.mockResolvedValue({ _sum: { totalDays: 0 } })

    await getUsedLeaveDaysThisYear(USER_ID, TYPE_ID)

    const call = mockAggregate.mock.calls[0][0]
    expect(call.where.status).toBe('APPROVED')
  })

  it('restricts the query to the current calendar year', async () => {
    mockAggregate.mockResolvedValue({ _sum: { totalDays: 0 } })

    await getUsedLeaveDaysThisYear(USER_ID, TYPE_ID)

    const call = mockAggregate.mock.calls[0][0]
    const currentYear = new Date().getFullYear()
    expect(call.where.leaveStartDateTime.gte.getFullYear()).toBe(currentYear)
    expect(call.where.leaveStartDateTime.lte.getFullYear()).toBe(currentYear)
  })

  it('sums the totalDays field', async () => {
    mockAggregate.mockResolvedValue({ _sum: { totalDays: 5 } })

    await getUsedLeaveDaysThisYear(USER_ID, TYPE_ID)

    const call = mockAggregate.mock.calls[0][0]
    expect(call._sum).toEqual({ totalDays: true })
  })

  it('uses the provided transaction client instead of default prisma', async () => {
    const txAggregate = vi.fn().mockResolvedValue({ _sum: { totalDays: 2 } })
    const tx = { leaveRequest: { aggregate: txAggregate } } as never

    const result = await getUsedLeaveDaysThisYear(USER_ID, TYPE_ID, tx)

    expect(result).toBe(2)
    expect(txAggregate).toHaveBeenCalledOnce()
    expect(mockAggregate).not.toHaveBeenCalled()
  })
})
