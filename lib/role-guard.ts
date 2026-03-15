/**
 * Permission Guard — role-based authorization.
 *
 * Roles: ADMIN > HR > MANAGER > EMPLOYEE
 * isAdmin  = ADMIN or HR
 * isManager = ADMIN, HR, or MANAGER
 */
import 'server-only'

//  Error 

export class PermissionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PermissionError'
  }
}

// Legacy alias so existing catch blocks don't break
export { PermissionError as RoleGuardError }

//  Guards 

/**
 * Throws PermissionError if the caller is not an admin (ADMIN or HR role).
 */
export function assertAdmin(isAdmin: boolean): void {
  if (!isAdmin) {
    throw new PermissionError('ไม่มีสิทธิ์เข้าถึง (ผู้ดูแลระบบเท่านั้น)')
  }
}

/**
 * Throws PermissionError if the caller does not have the given role(s).
 */
export function assertRole(role: string, ...allowed: string[]): void {
  if (!allowed.includes(role)) {
    throw new PermissionError(`ไม่มีสิทธิ์เข้าถึง (ต้องการ: ${allowed.join(', ')})`)
  }
}

/**
 * Returns true if the caller has one of the allowed roles.
 */
export const hasRole = (role: string, ...allowed: string[]): boolean =>
  allowed.includes(role)

//  Helpers used by service layer 

/** True when the caller is privileged (admin or HR). */
export const isPrivileged = (isAdmin: boolean): boolean => isAdmin
