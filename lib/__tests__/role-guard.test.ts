import { describe, it, expect } from 'vitest'

// role-guard has no DB dependency — mock server-only only
import { vi } from 'vitest'
vi.mock('server-only', () => ({}))

const {
  isAdmin, isHR, isManager, isPrivileged,
  hasRole, assertRole, assertHR, assertManager,
  roleLabel, RoleGuardError,
} = await import('../role-guard')

// ═════════════════════════════════════════════════════════════════════════════
// Boolean predicates
// ═════════════════════════════════════════════════════════════════════════════

describe('isAdmin', () => {
  it('returns true only for ADMIN', () => {
    expect(isAdmin('ADMIN')).toBe(true)
    expect(isAdmin('HR')).toBe(false)
    expect(isAdmin('MANAGER')).toBe(false)
    expect(isAdmin('EMPLOYEE')).toBe(false)
    expect(isAdmin('EXECUTIVE')).toBe(false)
  })
})

describe('isHR', () => {
  it('returns true for ADMIN and HR', () => {
    expect(isHR('ADMIN')).toBe(true)
    expect(isHR('HR')).toBe(true)
  })
  it('returns false for MANAGER, EMPLOYEE, EXECUTIVE', () => {
    expect(isHR('MANAGER')).toBe(false)
    expect(isHR('EMPLOYEE')).toBe(false)
    expect(isHR('EXECUTIVE')).toBe(false)
  })
})

describe('isManager', () => {
  it('returns true for ADMIN, HR, MANAGER', () => {
    expect(isManager('ADMIN')).toBe(true)
    expect(isManager('HR')).toBe(true)
    expect(isManager('MANAGER')).toBe(true)
  })
  it('returns false for EMPLOYEE and EXECUTIVE', () => {
    expect(isManager('EMPLOYEE')).toBe(false)
    expect(isManager('EXECUTIVE')).toBe(false)
  })
})

describe('isPrivileged', () => {
  it('is an alias for isHR — true for ADMIN and HR only', () => {
    expect(isPrivileged('ADMIN')).toBe(true)
    expect(isPrivileged('HR')).toBe(true)
    expect(isPrivileged('MANAGER')).toBe(false)
    expect(isPrivileged('EMPLOYEE')).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// hasRole
// ═════════════════════════════════════════════════════════════════════════════

describe('hasRole', () => {
  it('returns true when role is in the allowed list', () => {
    expect(hasRole('HR', 'HR', 'ADMIN')).toBe(true)
  })
  it('returns false when role is not in the allowed list', () => {
    expect(hasRole('EMPLOYEE', 'HR', 'ADMIN')).toBe(false)
  })
  it('handles a single allowed role', () => {
    expect(hasRole('ADMIN', 'ADMIN')).toBe(true)
    expect(hasRole('HR', 'ADMIN')).toBe(false)
  })
  it('handles unknown role string', () => {
    expect(hasRole('SUPER', 'ADMIN', 'HR')).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// assertRole
// ═════════════════════════════════════════════════════════════════════════════

describe('assertRole', () => {
  it('does not throw when caller has an allowed role', () => {
    expect(() => assertRole('HR', 'HR', 'ADMIN')).not.toThrow()
    expect(() => assertRole('ADMIN', 'HR', 'ADMIN')).not.toThrow()
  })

  it('throws RoleGuardError when caller role is not allowed', () => {
    expect(() => assertRole('EMPLOYEE', 'HR', 'ADMIN')).toThrow(RoleGuardError)
  })

  it('error message contains the required roles', () => {
    expect(() => assertRole('EMPLOYEE', 'HR', 'ADMIN')).toThrow(/HR|ADMIN/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// assertHR
// ═════════════════════════════════════════════════════════════════════════════

describe('assertHR', () => {
  it('does not throw for HR', () => {
    expect(() => assertHR('HR')).not.toThrow()
  })
  it('does not throw for ADMIN', () => {
    expect(() => assertHR('ADMIN')).not.toThrow()
  })
  it('throws RoleGuardError for MANAGER', () => {
    expect(() => assertHR('MANAGER')).toThrow(RoleGuardError)
  })
  it('throws RoleGuardError for EMPLOYEE', () => {
    expect(() => assertHR('EMPLOYEE')).toThrow(RoleGuardError)
  })
  it('throws RoleGuardError for EXECUTIVE', () => {
    expect(() => assertHR('EXECUTIVE')).toThrow(RoleGuardError)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// assertManager
// ═════════════════════════════════════════════════════════════════════════════

describe('assertManager', () => {
  it('does not throw for ADMIN, HR, MANAGER', () => {
    expect(() => assertManager('ADMIN')).not.toThrow()
    expect(() => assertManager('HR')).not.toThrow()
    expect(() => assertManager('MANAGER')).not.toThrow()
  })
  it('throws RoleGuardError for EMPLOYEE', () => {
    expect(() => assertManager('EMPLOYEE')).toThrow(RoleGuardError)
  })
  it('throws RoleGuardError for EXECUTIVE', () => {
    expect(() => assertManager('EXECUTIVE')).toThrow(RoleGuardError)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// roleLabel
// ═════════════════════════════════════════════════════════════════════════════

describe('roleLabel', () => {
  it.each([
    ['ADMIN',     'Admin'],
    ['HR',        'HR'],
    ['MANAGER',   'Manager'],
    ['EMPLOYEE',  'Employee'],
    ['EXECUTIVE', 'Executive'],
  ])('maps %s → %s', (role, expected) => {
    expect(roleLabel(role)).toBe(expected)
  })

  it('returns the raw role string for unknown roles', () => {
    expect(roleLabel('SUPERUSER')).toBe('SUPERUSER')
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// RoleGuardError
// ═════════════════════════════════════════════════════════════════════════════

describe('RoleGuardError', () => {
  it('is an instance of Error', () => {
    expect(new RoleGuardError('test')).toBeInstanceOf(Error)
  })
  it('has name "RoleGuardError"', () => {
    expect(new RoleGuardError('test').name).toBe('RoleGuardError')
  })
  it('carries the message', () => {
    expect(new RoleGuardError('oops').message).toBe('oops')
  })
})
