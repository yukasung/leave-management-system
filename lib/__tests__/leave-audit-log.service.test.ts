import { describe, it, expect, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@prisma/client', () => ({ Prisma: {} }))

const { logLeaveFieldChanges, leaveFieldChange } = await import('../leave-audit-log.service')

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTx() {
  return { leaveAuditLog: { createMany: vi.fn().mockResolvedValue({ count: 0 }) } }
}

const D1 = new Date('2026-01-05T00:00:00.000Z')
const D2 = new Date('2026-01-10T00:00:00.000Z')

// ═════════════════════════════════════════════════════════════════════════════
// logLeaveFieldChanges
// ═════════════════════════════════════════════════════════════════════════════

describe('logLeaveFieldChanges', () => {
  it('calls createMany with all changed entries', async () => {
    const tx = makeTx()
    const changes = [
      leaveFieldChange.status('DRAFT', 'PENDING'),
      leaveFieldChange.leaveTypeId('type-old', 'type-new'),
    ]
    await logLeaveFieldChanges(tx as never, 'leave-1', 'user-1', changes)

    expect(tx.leaveAuditLog.createMany).toHaveBeenCalledOnce()
    const { data } = tx.leaveAuditLog.createMany.mock.calls[0][0]
    expect(data).toHaveLength(2)
  })

  it('does NOT call createMany when all entries are unchanged', async () => {
    const tx = makeTx()
    const changes = [
      leaveFieldChange.status('PENDING', 'PENDING'), // same → filtered
    ]
    await logLeaveFieldChanges(tx as never, 'leave-1', 'user-1', changes)
    expect(tx.leaveAuditLog.createMany).not.toHaveBeenCalled()
  })

  it('filters out unchanged entries but logs the rest', async () => {
    const tx = makeTx()
    const changes = [
      leaveFieldChange.status('DRAFT', 'PENDING'),   // changed
      leaveFieldChange.leaveTypeId('type-1', 'type-1'), // unchanged → filtered
    ]
    await logLeaveFieldChanges(tx as never, 'leave-1', 'user-1', changes)

    const { data } = tx.leaveAuditLog.createMany.mock.calls[0][0]
    expect(data).toHaveLength(1)
    expect(data[0].fieldChanged).toBe('status')
  })

  it('does NOT call createMany for an empty changes array', async () => {
    const tx = makeTx()
    await logLeaveFieldChanges(tx as never, 'leave-1', 'user-1', [])
    expect(tx.leaveAuditLog.createMany).not.toHaveBeenCalled()
  })

  it('passes correct leaveId and changedBy to createMany rows', async () => {
    const tx = makeTx()
    await logLeaveFieldChanges(
      tx as never,
      'leave-42',
      'actor-99',
      [leaveFieldChange.status('DRAFT', 'PENDING')]
    )
    const row = tx.leaveAuditLog.createMany.mock.calls[0][0].data[0]
    expect(row.leaveId).toBe('leave-42')
    expect(row.changedBy).toBe('actor-99')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// leaveFieldChange builders
// ═════════════════════════════════════════════════════════════════════════════

describe('leaveFieldChange.status', () => {
  it('sets fieldChanged to "status"', () => {
    expect(leaveFieldChange.status('DRAFT', 'PENDING').fieldChanged).toBe('status')
  })

  it('carries oldValue and newValue as strings', () => {
    const c = leaveFieldChange.status('DRAFT', 'PENDING')
    expect(c.oldValue).toBe('DRAFT')
    expect(c.newValue).toBe('PENDING')
  })

  it('accepts null oldValue (new record creation)', () => {
    expect(leaveFieldChange.status(null, 'DRAFT').oldValue).toBeNull()
  })
})

describe('leaveFieldChange.leaveTypeId', () => {
  it('sets fieldChanged to "leaveTypeId"', () => {
    expect(leaveFieldChange.leaveTypeId('old', 'new').fieldChanged).toBe('leaveTypeId')
  })

  it('accepts null oldValue', () => {
    expect(leaveFieldChange.leaveTypeId(null, 'type-1').oldValue).toBeNull()
  })
})

describe('leaveFieldChange.leaveStartDateTime', () => {
  it('sets fieldChanged to "leaveStartDateTime"', () => {
    expect(leaveFieldChange.leaveStartDateTime(D1, D2).fieldChanged).toBe('leaveStartDateTime')
  })

  it('serialises Date values to ISO strings', () => {
    const c = leaveFieldChange.leaveStartDateTime(D1, D2)
    expect(c.oldValue).toBe(D1.toISOString())
    expect(c.newValue).toBe(D2.toISOString())
  })

  it('accepts null oldValue', () => {
    expect(leaveFieldChange.leaveStartDateTime(null, D2).oldValue).toBeNull()
  })
})

describe('leaveFieldChange.leaveEndDateTime', () => {
  it('sets fieldChanged to "leaveEndDateTime"', () => {
    expect(leaveFieldChange.leaveEndDateTime(D1, D2).fieldChanged).toBe('leaveEndDateTime')
  })

  it('serialises Date values to ISO strings', () => {
    const c = leaveFieldChange.leaveEndDateTime(D1, D2)
    expect(c.oldValue).toBe(D1.toISOString())
    expect(c.newValue).toBe(D2.toISOString())
  })
})
