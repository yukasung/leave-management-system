/**
 * Leave Audit Log Service — field-level change tracking for LeaveRequest.
 *
 * Every change to a tracked field (status, startDate, endDate, leaveTypeId)
 * inserts one row per changed field into `leave_audit_logs`.
 *
 * Design principles:
 *  - Always called inside a Prisma transaction so the log is atomic with the
 *    mutation it records.
 *  - Skips entries where old === new (no real change).
 *  - Non-throwing: callers should not lose their primary operation if logging
 *    fails — wrap in try/catch at the call site when needed.
 */
import 'server-only'

import { Prisma } from '@prisma/client'

// Accepts both PrismaClient and Prisma.TransactionClient — only needs leaveAuditLog
type AuditClient = { leaveAuditLog: Prisma.TransactionClient['leaveAuditLog'] }

// ── Types ─────────────────────────────────────────────────────────────────────

export type LeaveFieldChange = {
  /** The name of the field that changed, e.g. 'status', 'startDate'. */
  fieldChanged: string
  /** Serialised old value, or null when the record is being created. */
  oldValue: string | null
  /** Serialised new value, or null when the record is being deleted. */
  newValue: string | null
}

// ── Helper: serialise a Date or leave it as-is ────────────────────────────────

function str(value: string | Date | null | undefined): string | null {
  if (value == null) return null
  if (value instanceof Date) return value.toISOString()
  return value
}

// ── Core logger ───────────────────────────────────────────────────────────────

/**
 * Insert one row per tracked field change into `leave_audit_logs`.
 * Duplicate entries (oldValue === newValue) are filtered out automatically.
 *
 * Must be called inside a `prisma.$transaction` callback so the log rows
 * land in the same atomic unit as the mutation.
 *
 * @param tx         - The transaction client from `prisma.$transaction`
 * @param leaveId    - ID of the affected LeaveRequest
 * @param changedBy  - User ID of the actor making the change
 * @param changes    - Array of field-level diffs to record
 */
export async function logLeaveFieldChanges(
  tx: AuditClient,
  leaveId: string,
  changedBy: string,
  changes: LeaveFieldChange[]
): Promise<void> {
  const filtered = changes.filter((c) => c.oldValue !== c.newValue)
  if (filtered.length === 0) return

  await tx.leaveAuditLog.createMany({
    data: filtered.map((c) => ({
      leaveId,
      changedBy,
      fieldChanged: c.fieldChanged,
      oldValue:     c.oldValue,
      newValue:     c.newValue,
    })),
  })
}

// ── Typed builders — avoids typos at call sites ───────────────────────────────

export const leaveFieldChange = {
  status: (oldValue: string | null, newValue: string): LeaveFieldChange => ({
    fieldChanged: 'status',
    oldValue:     str(oldValue),
    newValue:     str(newValue),
  }),

  leaveTypeId: (oldValue: string | null, newValue: string): LeaveFieldChange => ({
    fieldChanged: 'leaveTypeId',
    oldValue:     str(oldValue),
    newValue:     str(newValue),
  }),

  leaveStartDateTime: (oldValue: Date | null, newValue: Date): LeaveFieldChange => ({
    fieldChanged: 'leaveStartDateTime',
    oldValue:     str(oldValue),
    newValue:     str(newValue),
  }),

  leaveEndDateTime: (oldValue: Date | null, newValue: Date): LeaveFieldChange => ({
    fieldChanged: 'leaveEndDateTime',
    oldValue:     str(oldValue),
    newValue:     str(newValue),
  }),
}
