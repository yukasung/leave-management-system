/**
 * Permission Guard  simple isAdmin-based authorization.
 *
 * In this system there are no roles. Every user is either an admin or not.
 * Admin users can manage employees, view all leave, and act as fallback approvers.
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

//  Guard 

/**
 * Throws PermissionError if the caller is not an admin.
 */
export function assertAdmin(isAdmin: boolean): void {
  if (!isAdmin) {
    throw new PermissionError('ไม่มีสิทธิ์เข้าถึง (ผู้ดูแลระบบเท่านั้น)')
  }
}

//  Helpers used by service layer 

/** True when the caller is privileged (admin). Used by service functions. */
export const isPrivileged = (isAdmin: boolean): boolean => isAdmin
