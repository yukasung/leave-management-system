/**
 * Role Guard — single source of truth for all role-based authorization.
 *
 * Usage in service layer:
 *   import { isPrivileged, assertHR } from '@/lib/role-guard'
 *
 * Usage in actions (controller):
 *   — None. Actions pass session.user.role to the service and let the
 *     service handle authorization via this module.
 */
import 'server-only'

export type AppRole = 'ADMIN' | 'HR' | 'MANAGER' | 'EMPLOYEE' | 'EXECUTIVE'

// ── Error ─────────────────────────────────────────────────────────────────────

export class RoleGuardError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoleGuardError'
  }
}

// ── Boolean predicates (no throw — use in service branch logic) ───────────────

export const isAdmin     = (role: string): boolean => role === 'ADMIN'
export const isHR        = (role: string): boolean => role === 'HR' || role === 'ADMIN'
export const isManager   = (role: string): boolean =>
  role === 'MANAGER' || role === 'HR' || role === 'ADMIN'
export const isPrivileged = isHR   // alias — "privileged" means HR or ADMIN in this system

export function hasRole(role: string, ...allowed: AppRole[]): boolean {
  return allowed.includes(role as AppRole)
}

// ── Throwing guards (use at authorization checkpoints) ────────────────────────

/**
 * Throws RoleGuardError if the caller's role is not in the allowed list.
 */
export function assertRole(callerRole: string, ...allowed: AppRole[]): void {
  if (!hasRole(callerRole, ...allowed)) {
    const label = allowed.join(' หรือ ')
    throw new RoleGuardError(
      `คุณไม่มีสิทธิ์ดำเนินการนี้ (ต้องการสิทธิ์: ${label})`
    )
  }
}

/**
 * Throws RoleGuardError if the caller is not HR or ADMIN.
 * Use this for operations that require HR override power.
 */
export function assertHR(callerRole: string): void {
  assertRole(callerRole, 'HR', 'ADMIN')
}

/**
 * Throws RoleGuardError if the caller lacks manager-level access.
 */
export function assertManager(callerRole: string): void {
  assertRole(callerRole, 'MANAGER', 'HR', 'ADMIN')
}

/**
 * Human-readable label for a role, used in audit log descriptions.
 */
export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN:     'Admin',
    HR:        'HR',
    MANAGER:   'Manager',
    EMPLOYEE:  'Employee',
    EXECUTIVE: 'Executive',
  }
  return labels[role] ?? role
}
