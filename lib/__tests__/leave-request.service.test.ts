import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Static mocks (before any imports) ────────────────────────────────────────

vi.mock('server-only', () => ({}))

// Prisma enum-like constants
const LeaveStatus = {
  DRAFT:             'DRAFT',
  PENDING:           'PENDING',
  IN_REVIEW:         'IN_REVIEW',
  APPROVED:          'APPROVED',
  REJECTED:          'REJECTED',
  CANCELLED:         'CANCELLED',
  CANCEL_REQUESTED:  'CANCEL_REQUESTED',
} as const

vi.mock('@prisma/client', () => ({
  LeaveStatus,
  ApprovalStatus: { PENDING: 'PENDING' },
  Prisma: {},
}))

// Build a Prisma transaction mock that immediately invokes the callback
function makeTx() {
  return {
    leaveRequest:  { update: vi.fn(), create: vi.fn() },
    leaveBalance:  { findUnique: vi.fn().mockResolvedValue(null), updateMany: vi.fn() },
    auditLog:      { create: vi.fn() },
    approval:      { deleteMany: vi.fn(), create: vi.fn() },
    user:          { findMany: vi.fn().mockResolvedValue([]) },
  }
}

const mockTransaction = vi.fn()
const mockFindUniqueLeaveRequest = vi.fn()
const mockFindUniqueLeaveType    = vi.fn()
const mockFindUniqueUser         = vi.fn()
const mockFindFirstUser          = vi.fn()
const mockAuditCreate            = vi.fn()
const mockLeaveRequestUpdate     = vi.fn().mockResolvedValue({ status: 'PENDING' })
const mockUserFindMany           = vi.fn().mockResolvedValue([])
const mockApprovalDeleteMany     = vi.fn().mockResolvedValue({})
const mockApprovalCreate         = vi.fn().mockResolvedValue({})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction:   mockTransaction,
    leaveRequest:   { findUnique: mockFindUniqueLeaveRequest, update: mockLeaveRequestUpdate },
    leaveType:      { findUnique: mockFindUniqueLeaveType },
    user:           { findUnique: mockFindUniqueUser, findFirst: mockFindFirstUser, findMany: mockUserFindMany },
    auditLog:       { create: mockAuditCreate },
    approval:       { deleteMany: mockApprovalDeleteMany, create: mockApprovalCreate },
    leaveBalance:   { findUnique: vi.fn().mockResolvedValue(null), updateMany: vi.fn() },
    leaveAuditLog:  { findFirst: vi.fn().mockResolvedValue(null) },
  },
}))

const mockGetUsed = vi.fn()
vi.mock('@/lib/leave-policy', () => ({
  getUsedLeaveDaysThisYear: mockGetUsed,
}))

vi.mock('@/lib/leave-audit-log.service', () => ({
  logLeaveFieldChanges: vi.fn().mockResolvedValue(undefined),
  leaveFieldChange: {
    status:              vi.fn().mockReturnValue({}),
    leaveTypeId:         vi.fn().mockReturnValue({}),
    leaveStartDateTime:  vi.fn().mockReturnValue({}),
    leaveEndDateTime:    vi.fn().mockReturnValue({}),
  },
}))

vi.mock('@/lib/role-guard', () => ({
  isPrivileged: vi.fn((isAdmin: boolean) => isAdmin),
}))

vi.mock('@/lib/mailer', () => ({
  sendMail:               vi.fn().mockResolvedValue(undefined),
  buildLeaveRequestEmail: vi.fn().mockReturnValue({ subject: '', html: '', text: '' }),
}))

// Import after mocks
const { createDraft, submitLeave, cancelLeave, updateLeave, LeaveServiceError } =
  await import('../leave-request.service')

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FUTURE = new Date(Date.now() + 7 * 86400_000)  // 7 days from now

function baseInput(overrides: Record<string, unknown> = {}) {
  return {
    userId:               'user-1',
    leaveTypeId:          'type-1',
    leaveStartDateTime:   FUTURE,
    leaveEndDateTime:     FUTURE,
    totalDays:            1,
    reason:               null,
    documentUrl:          null,
    ...overrides,
  }
}

function leaveType(overrides: Record<string, unknown> = {}) {
  return {
    id:                   'type-1',
    name:                 'ลาพักผ่อน',
    maxDaysPerYear:       null,
    maxDaysPerRequest:    null,
    requiresAttachment:   false,
    deductFromBalance:    false,
    allowDuringProbation: true,
    ...overrides,
  }
}

function leaveRow(overrides: Record<string, unknown> = {}) {
  return {
    id:          'leave-1',
    userId:      'user-1',
    status:      LeaveStatus.DRAFT,
    startDate:   FUTURE,
    endDate:     FUTURE,
    totalDays:   1,
    leaveTypeId: 'type-1',
    leaveType:   { name: 'ลาพักผ่อน', deductFromBalance: false },
    user:        { name: 'Alice', employee: { managerId: null } },
    ...overrides,
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// createDraft
// ═════════════════════════════════════════════════════════════════════════════

describe('createDraft — guard clauses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUniqueUser.mockResolvedValue({ isProbation: false, name: 'Alice', employee: { managerId: null } })
    mockGetUsed.mockResolvedValue(0)
    mockAuditCreate.mockResolvedValue({})
  })

  it('throws LeaveServiceError when leave type does not exist', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(null)
    await expect(createDraft(baseInput())).rejects.toThrow(LeaveServiceError)
    await expect(createDraft(baseInput())).rejects.toThrow('ไม่พบประเภทการลา')
  })

  it('throws when totalDays exceeds maxDaysPerRequest', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(leaveType({ maxDaysPerRequest: 3 }))
    await expect(createDraft(baseInput({ totalDays: 5 }))).rejects.toThrow(LeaveServiceError)
    await expect(createDraft(baseInput({ totalDays: 5 }))).rejects.toThrow('maxDaysPerRequest' in {} ? '' : 'เกินจำนวนวันลาสูงสุดต่อครั้ง')
  })

  it('throws when used + totalDays exceeds maxDaysPerYear', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(leaveType({ maxDaysPerYear: 10 }))
    mockGetUsed.mockResolvedValue(9)     // already used 9, request 2 more
    await expect(createDraft(baseInput({ totalDays: 2 }))).rejects.toThrow(LeaveServiceError)
    await expect(createDraft(baseInput({ totalDays: 2 }))).rejects.toThrow('เกินสิทธิ์ลาประจำปี')
  })

  it('does NOT throw when used + totalDays exactly equals maxDaysPerYear', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(leaveType({ maxDaysPerYear: 10 }))
    mockGetUsed.mockResolvedValue(9)     // 9 used + 1 = 10 exactly
    const tx = makeTx()
    tx.leaveRequest.create = vi.fn().mockResolvedValue({ id: 'leave-new' })
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    await expect(createDraft(baseInput({ totalDays: 1 }))).resolves.toBeDefined()
  })

  it('throws when requiresAttachment is true and no documentUrl', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(leaveType({ requiresAttachment: true }))
    await expect(createDraft(baseInput({ documentUrl: null }))).rejects.toThrow(LeaveServiceError)
    await expect(createDraft(baseInput({ documentUrl: null }))).rejects.toThrow('แนบเอกสาร')
  })

  it('does NOT throw when requiresAttachment is true and documentUrl is provided', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(leaveType({ requiresAttachment: true }))
    const tx = makeTx()
    tx.leaveRequest.create = vi.fn().mockResolvedValue({ id: 'leave-new' })
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    await expect(createDraft(baseInput({ documentUrl: 'https://example.com/doc.pdf' }))).resolves.toBeDefined()
  })

  it('throws when user is on probation and leave type disallows it', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(leaveType({ allowDuringProbation: false }))
    mockFindUniqueUser.mockResolvedValue({ name: 'Bob', employee: { managerId: null, isProbation: true, approvers: [] } })
    await expect(createDraft(baseInput())).rejects.toThrow(LeaveServiceError)
    await expect(createDraft(baseInput())).rejects.toThrow('ทดลองงาน')
  })

  it('does NOT throw when user is NOT on probation and leave type disallows probation', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(leaveType({ allowDuringProbation: false }))
    mockFindUniqueUser.mockResolvedValue({ name: 'Alice', employee: { managerId: null, isProbation: false, approvers: [] } })
    const tx = makeTx()
    tx.leaveRequest.create = vi.fn().mockResolvedValue({ id: 'leave-new' })
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    await expect(createDraft(baseInput())).resolves.toBeDefined()
  })

  it('throws when balance is insufficient (deductFromBalance=true)', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(leaveType({ deductFromBalance: true }))
    const tx = makeTx()
    // balance: totalDays=3, usedDays=3  → remaining=0
    tx.leaveBalance.findUnique = vi.fn().mockResolvedValue({ totalDays: 3, usedDays: 3 })
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    await expect(createDraft(baseInput({ totalDays: 1 }))).rejects.toThrow('สิทธิ์การลาไม่เพียงพอ')
  })

  it('returns leaveRequestId on success', async () => {
    mockFindUniqueLeaveType.mockResolvedValue(leaveType())
    const tx = makeTx()
    tx.leaveRequest.create = vi.fn().mockResolvedValue({ id: 'leave-new' })
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    const result = await createDraft(baseInput())
    expect(result).toEqual({ leaveRequestId: 'leave-new' })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// submitLeave
// ═════════════════════════════════════════════════════════════════════════════

describe('submitLeave — guard clauses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when leave request does not exist', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(null)
    await expect(submitLeave('user-1', 'leave-x')).rejects.toThrow('ไม่พบคำขอลา')
  })

  it('throws when leave belongs to a different user', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ userId: 'other-user' }))
    await expect(submitLeave('user-1', 'leave-1')).rejects.toThrow('ไม่มีสิทธิ์')
  })

  it('throws when leave is not in DRAFT status', async () => {
    for (const status of [LeaveStatus.PENDING, LeaveStatus.APPROVED, LeaveStatus.CANCELLED]) {
      mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status }))
      await expect(submitLeave('user-1', 'leave-1')).rejects.toThrow(LeaveServiceError)
    }
  })

  it('succeeds when leave is a DRAFT owned by caller', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow())
    mockFindFirstUser.mockResolvedValue({ id: 'hr-1' })
    const tx = makeTx()
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    await expect(submitLeave('user-1', 'leave-1')).resolves.toBeUndefined()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// cancelLeave
// ═════════════════════════════════════════════════════════════════════════════

describe('cancelLeave — guard clauses', () => {
  beforeEach(() => vi.clearAllMocks())

  it('throws when leave request does not exist', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(null)
    await expect(cancelLeave('user-1', false, 'leave-x')).rejects.toThrow('ไม่พบคำขอลา')
  })

  it('throws when non-privileged caller does not own the leave', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ userId: 'other-user' }))
    await expect(cancelLeave('user-1', false, 'leave-1')).rejects.toThrow('ไม่มีสิทธิ์ยกเลิก')
  })

  it('throws when status is REJECTED (terminal)', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.REJECTED }))
    await expect(cancelLeave('user-1', false, 'leave-1')).rejects.toThrow('ถูกปฏิเสธ')
  })

  it('throws when status is already CANCELLED (terminal)', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.CANCELLED }))
    await expect(cancelLeave('user-1', false, 'leave-1')).rejects.toThrow('ถูกยกเลิกไปแล้ว')
  })

  it('throws when CANCEL_REQUESTED and caller is non-privileged', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.CANCEL_REQUESTED }))
    await expect(cancelLeave('user-1', false, 'leave-1')).rejects.toThrow('รอการพิจารณา')
  })

  it('throws when non-privileged owner tries to cancel APPROVED leave', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.APPROVED }))
    await expect(cancelLeave('user-1', false, 'leave-1')).rejects.toThrow(LeaveServiceError)
    await expect(cancelLeave('user-1', false, 'leave-1')).rejects.toThrow('อนุมัติแล้วไม่สามารถยกเลิกเอง')
  })

  it('returns { requestedCancellation: false } when HR cancels APPROVED leave', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.APPROVED }))
    const tx = makeTx()
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    const result = await cancelLeave('hr-1', true, 'leave-1')
    expect(result).toEqual({ requestedCancellation: false })
  })

  it('returns { requestedCancellation: false } when cancelling a DRAFT', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.DRAFT }))
    const tx = makeTx()
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    const result = await cancelLeave('user-1', false, 'leave-1')
    expect(result).toEqual({ requestedCancellation: false })
  })

  it('returns { requestedCancellation: true } when non-privileged owner cancels a PENDING leave', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.PENDING }))
    const result = await cancelLeave('user-1', false, 'leave-1')
    expect(result).toEqual({ requestedCancellation: true })
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// updateLeave — status / ownership guards
// ═════════════════════════════════════════════════════════════════════════════

describe('updateLeave — guard clauses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUsed.mockResolvedValue(0)
    mockAuditCreate.mockResolvedValue({})
  })

  const updateInput = {
    leaveTypeId:          'type-1',
    leaveStartDateTime:   FUTURE,
    leaveEndDateTime:     FUTURE,
    totalDays:            1,
    reason:               null,
    documentUrl:          null,
  }

  it('throws when leave request does not exist', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(null)
    await expect(updateLeave('user-1', false, 'leave-x', updateInput)).rejects.toThrow('ไม่พบคำขอลา')
  })

  it('throws when non-privileged caller does not own the leave', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ userId: 'other-user' }))
    await expect(updateLeave('user-1', false, 'leave-1', updateInput)).rejects.toThrow('ไม่มีสิทธิ์')
  })

  it('throws when status is PENDING', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.PENDING }))
    await expect(updateLeave('user-1', false, 'leave-1', updateInput)).rejects.toThrow('Cannot edit pending leave')
  })

  it('throws when status is APPROVED and caller is non-privileged', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.APPROVED }))
    await expect(updateLeave('user-1', false, 'leave-1', updateInput)).rejects.toThrow('Approved leave cannot be edited')
  })

  it('throws when status is REJECTED', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.REJECTED }))
    await expect(updateLeave('user-1', false, 'leave-1', updateInput)).rejects.toThrow(LeaveServiceError)
  })

  it('throws when status is CANCELLED', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.CANCELLED }))
    await expect(updateLeave('user-1', false, 'leave-1', updateInput)).rejects.toThrow(LeaveServiceError)
  })

  it('throws when status is IN_REVIEW', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ status: LeaveStatus.IN_REVIEW }))
    await expect(updateLeave('user-1', false, 'leave-1', updateInput)).rejects.toThrow(LeaveServiceError)
  })

  it('succeeds for a DRAFT leave owned by the caller', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow())
    mockFindUniqueLeaveType.mockResolvedValue(leaveType())
    const tx = makeTx()
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    await expect(updateLeave('user-1', false, 'leave-1', updateInput)).resolves.toBeUndefined()
  })

  it('allows HR to edit a DRAFT owned by another user', async () => {
    mockFindUniqueLeaveRequest.mockResolvedValue(leaveRow({ userId: 'other-user' }))
    mockFindUniqueLeaveType.mockResolvedValue(leaveType())
    const tx = makeTx()
    mockTransaction.mockImplementation((cb: (tx: ReturnType<typeof makeTx>) => unknown) => cb(tx))
    await expect(updateLeave('hr-1', true, 'leave-1', updateInput)).resolves.toBeUndefined()
  })
})
