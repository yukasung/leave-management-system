import { describe, it, expect } from 'vitest'
import { STATUS_LABEL, STATUS_BADGE, STATUS_DOT } from '../leave-status'

const ALL_STATUSES = [
  'DRAFT',
  'PENDING',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'CANCEL_REQUESTED',
] as const

// ── STATUS_LABEL ──────────────────────────────────────────────────────────────

describe('STATUS_LABEL', () => {
  it('contains all expected status keys', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_LABEL).toHaveProperty(s)
    }
  })

  it('has no blank labels', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_LABEL[s].length).toBeGreaterThan(0)
    }
  })

  it('DRAFT = "ร่าง"',             () => expect(STATUS_LABEL['DRAFT']).toBe('ร่าง'))
  it('PENDING = "รออนุมัติ"',       () => expect(STATUS_LABEL['PENDING']).toBe('รออนุมัติ'))
  it('IN_REVIEW = "รอ HR"',         () => expect(STATUS_LABEL['IN_REVIEW']).toBe('รอ HR'))
  it('APPROVED = "อนุมัติแล้ว"',    () => expect(STATUS_LABEL['APPROVED']).toBe('อนุมัติแล้ว'))
  it('REJECTED = "ปฏิเสธ"',        () => expect(STATUS_LABEL['REJECTED']).toBe('ปฏิเสธ'))
  it('CANCELLED = "ยกเลิกแล้ว"',   () => expect(STATUS_LABEL['CANCELLED']).toBe('ยกเลิกแล้ว'))
  it('CANCEL_REQUESTED = "ขอยกเลิก"', () => expect(STATUS_LABEL['CANCEL_REQUESTED']).toBe('ขอยกเลิก'))
})

// ── STATUS_BADGE ──────────────────────────────────────────────────────────────

describe('STATUS_BADGE', () => {
  it('contains all expected status keys', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_BADGE).toHaveProperty(s)
    }
  })

  it('has non-empty class strings for every status', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_BADGE[s].length).toBeGreaterThan(0)
    }
  })

  it('APPROVED badge contains emerald color', () => {
    expect(STATUS_BADGE['APPROVED']).toContain('emerald')
  })

  it('REJECTED badge contains red color', () => {
    expect(STATUS_BADGE['REJECTED']).toContain('red')
  })

  it('PENDING badge contains amber color', () => {
    expect(STATUS_BADGE['PENDING']).toContain('amber')
  })

  it('IN_REVIEW badge contains blue color', () => {
    expect(STATUS_BADGE['IN_REVIEW']).toContain('blue')
  })

  it('CANCEL_REQUESTED badge contains orange color', () => {
    expect(STATUS_BADGE['CANCEL_REQUESTED']).toContain('orange')
  })

  it('all badge strings include dark mode classes', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_BADGE[s]).toContain('dark:')
    }
  })
})

// ── STATUS_DOT ────────────────────────────────────────────────────────────────

describe('STATUS_DOT', () => {
  it('contains all expected status keys', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_DOT).toHaveProperty(s)
    }
  })

  it('has non-empty class strings for every status', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_DOT[s].length).toBeGreaterThan(0)
    }
  })

  it('APPROVED dot is bg-emerald-500', () => {
    expect(STATUS_DOT['APPROVED']).toBe('bg-emerald-500')
  })

  it('REJECTED dot is bg-red-500', () => {
    expect(STATUS_DOT['REJECTED']).toBe('bg-red-500')
  })

  it('PENDING dot is bg-amber-500', () => {
    expect(STATUS_DOT['PENDING']).toBe('bg-amber-500')
  })

  it('IN_REVIEW dot is bg-blue-500', () => {
    expect(STATUS_DOT['IN_REVIEW']).toBe('bg-blue-500')
  })

  it('CANCEL_REQUESTED dot is bg-orange-500', () => {
    expect(STATUS_DOT['CANCEL_REQUESTED']).toBe('bg-orange-500')
  })

  it('DRAFT and CANCELLED share the same muted dot color', () => {
    expect(STATUS_DOT['DRAFT']).toBe(STATUS_DOT['CANCELLED'])
  })

  it('all dot classes start with "bg-"', () => {
    for (const s of ALL_STATUSES) {
      expect(STATUS_DOT[s]).toMatch(/^bg-/)
    }
  })
})
