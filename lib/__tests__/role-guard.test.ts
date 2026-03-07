import { describe, it, expect } from 'vitest'

// role-guard has no DB dependency  mock server-only only
import { vi } from 'vitest'
vi.mock('server-only', () => ({}))

const {
  isPrivileged, assertAdmin, RoleGuardError, PermissionError,
} = await import('../role-guard')

// 
// isPrivileged
// 

describe('isPrivileged', () => {
  it('returns true when isAdmin is true', () => {
    expect(isPrivileged(true)).toBe(true)
  })
  it('returns false when isAdmin is false', () => {
    expect(isPrivileged(false)).toBe(false)
  })
})

// 
// assertAdmin
// 

describe('assertAdmin', () => {
  it('does not throw when isAdmin is true', () => {
    expect(() => assertAdmin(true)).not.toThrow()
  })

  it('throws PermissionError when isAdmin is false', () => {
    expect(() => assertAdmin(false)).toThrow(PermissionError)
  })

  it('thrown error is also a RoleGuardError (legacy alias)', () => {
    expect(() => assertAdmin(false)).toThrow(RoleGuardError)
  })

  it('thrown error message mentions admin', () => {
    expect(() => assertAdmin(false)).toThrow(/admin/i)
  })
})

// 
// PermissionError / RoleGuardError
// 

describe('PermissionError', () => {
  it('is an instance of Error', () => {
    expect(new PermissionError('test')).toBeInstanceOf(Error)
  })
  it('has name "PermissionError"', () => {
    expect(new PermissionError('test').name).toBe('PermissionError')
  })
  it('carries the message', () => {
    expect(new PermissionError('oops').message).toBe('oops')
  })
})

describe('RoleGuardError (legacy alias)', () => {
  it('is the same class as PermissionError', () => {
    expect(RoleGuardError).toBe(PermissionError)
  })
  it('is an instance of Error', () => {
    expect(new RoleGuardError('test')).toBeInstanceOf(Error)
  })
})