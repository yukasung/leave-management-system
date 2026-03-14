import { describe, it, expect } from 'vitest'
import {
  buildPolicySummary,
  LEAVE_CATEGORY_LABEL,
  LEAVE_LIMIT_TYPE_LABEL,
  DAY_COUNT_TYPE_LABEL,
  type LeaveTypePolicy,
} from '../leave-policy-utils'

// ── Helpers ───────────────────────────────────────────────────────────────────

function policy(overrides: Partial<LeaveTypePolicy> = {}): LeaveTypePolicy {
  return {
    id: 'test-id',
    name: 'Test Leave',
    maxDaysPerYear: null,
    maxDaysPerRequest: null,
    requiresAttachment: false,
    deductFromBalance: true,
    allowDuringProbation: true,
    leaveCategory: null,
    leaveLimitType: 'PER_YEAR',
    dayCountType: 'WORKING_DAY',
    ...overrides,
  }
}

// ── buildPolicySummary ────────────────────────────────────────────────────────

describe('buildPolicySummary', () => {

  // ── No constraints ──────────────────────────────────────────────────────────

  it('returns fallback message when no constraints are set', () => {
    expect(buildPolicySummary(policy())).toBe('ไม่มีเงื่อนไขพิเศษ')
  })

  // ── Single flags ────────────────────────────────────────────────────────────

  it('shows maxDaysPerYear when set', () => {
    expect(buildPolicySummary(policy({ maxDaysPerYear: 30 }))).toBe('ไม่เกิน 30 วันต่อปี')
  })

  it('shows maxDaysPerRequest when set', () => {
    expect(buildPolicySummary(policy({ maxDaysPerRequest: 7 }))).toBe('ไม่เกิน 7 วันต่อครั้ง')
  })

  it('shows requiresAttachment when true', () => {
    expect(buildPolicySummary(policy({ requiresAttachment: true }))).toBe('ต้องแนบเอกสาร')
  })

  it('shows ไม่หักสิทธิ์ when deductFromBalance is false', () => {
    expect(buildPolicySummary(policy({ deductFromBalance: false }))).toBe('ไม่หักสิทธิ์')
  })

  it('shows ไม่อนุญาตช่วงทดลองงาน when allowDuringProbation is false', () => {
    expect(buildPolicySummary(policy({ allowDuringProbation: false }))).toBe('ไม่อนุญาตช่วงทดลองงาน')
  })

  // ── Does NOT show when default ──────────────────────────────────────────────

  it('does NOT show ไม่หักสิทธิ์ when deductFromBalance is true', () => {
    expect(buildPolicySummary(policy({ deductFromBalance: true }))).not.toContain('ไม่หักสิทธิ์')
  })

  it('does NOT show ไม่อนุญาตช่วงทดลองงาน when allowDuringProbation is true', () => {
    expect(buildPolicySummary(policy({ allowDuringProbation: true }))).not.toContain('ไม่อนุญาตช่วงทดลองงาน')
  })

  it('does NOT show maxDaysPerYear when null', () => {
    expect(buildPolicySummary(policy({ maxDaysPerYear: null }))).not.toContain('วันต่อปี')
  })

  it('does NOT show maxDaysPerRequest when null', () => {
    expect(buildPolicySummary(policy({ maxDaysPerRequest: null }))).not.toContain('วันต่อครั้ง')
  })

  // ── Multiple flags joined with · ────────────────────────────────────────────

  it('joins multiple parts with " · "', () => {
    const result = buildPolicySummary(policy({
      maxDaysPerYear: 12,
      maxDaysPerRequest: 3,
    }))
    expect(result).toBe('ไม่เกิน 12 วันต่อปี · ไม่เกิน 3 วันต่อครั้ง')
  })

  it('shows all constraints when every flag is active', () => {
    const result = buildPolicySummary(policy({
      maxDaysPerYear: 30,
      maxDaysPerRequest: 5,
      requiresAttachment: true,
      deductFromBalance: false,
      allowDuringProbation: false,
    }))
    expect(result).toBe(
      'ไม่เกิน 30 วันต่อปี · ไม่เกิน 5 วันต่อครั้ง · ต้องแนบเอกสาร · ไม่หักสิทธิ์ · ไม่อนุญาตช่วงทดลองงาน'
    )
  })

  it('preserves the order: year → request → attachment → balance → probation', () => {
    const result = buildPolicySummary(policy({
      maxDaysPerYear: 10,
      requiresAttachment: true,
      allowDuringProbation: false,
    }))
    const parts = result.split(' · ')
    expect(parts[0]).toContain('วันต่อปี')
    expect(parts[1]).toContain('แนบเอกสาร')
    expect(parts[2]).toContain('ทดลองงาน')
  })

  // ── Edge values ─────────────────────────────────────────────────────────────

  it('handles maxDaysPerYear = 1 without pluralisation issues', () => {
    expect(buildPolicySummary(policy({ maxDaysPerYear: 1 }))).toBe('ไม่เกิน 1 วันต่อปี')
  })

  it('handles maxDaysPerYear = 0', () => {
    expect(buildPolicySummary(policy({ maxDaysPerYear: 0 }))).toBe('ไม่เกิน 0 วันต่อปี')
  })
})

// ── LEAVE_CATEGORY_LABEL ──────────────────────────────────────────────────────

describe('LEAVE_CATEGORY_LABEL', () => {
  it('ANNUAL = "ลาประจำปี"', () => {
    expect(LEAVE_CATEGORY_LABEL['ANNUAL']).toBe('ลาประจำปี')
  })

  it('EVENT = "ลาพิเศษ"', () => {
    expect(LEAVE_CATEGORY_LABEL['EVENT']).toBe('ลาพิเศษ')
  })

  it('contains exactly 2 entries', () => {
    expect(Object.keys(LEAVE_CATEGORY_LABEL)).toHaveLength(2)
  })

  it('has no blank values', () => {
    for (const v of Object.values(LEAVE_CATEGORY_LABEL)) {
      expect(v.length).toBeGreaterThan(0)
    }
  })
})

// ── LEAVE_LIMIT_TYPE_LABEL ────────────────────────────────────────────────────

describe('LEAVE_LIMIT_TYPE_LABEL', () => {
  it('PER_YEAR = "ต่อปี"', () => {
    expect(LEAVE_LIMIT_TYPE_LABEL['PER_YEAR']).toBe('ต่อปี')
  })

  it('PER_EVENT = "ต่อครั้ง"', () => {
    expect(LEAVE_LIMIT_TYPE_LABEL['PER_EVENT']).toBe('ต่อครั้ง')
  })

  it('MEDICAL_BASED = "ตามใบรับรองแพทย์"', () => {
    expect(LEAVE_LIMIT_TYPE_LABEL['MEDICAL_BASED']).toBe('ตามใบรับรองแพทย์')
  })

  it('contains exactly 3 entries', () => {
    expect(Object.keys(LEAVE_LIMIT_TYPE_LABEL)).toHaveLength(3)
  })

  it('has no blank values', () => {
    for (const v of Object.values(LEAVE_LIMIT_TYPE_LABEL)) {
      expect(v.length).toBeGreaterThan(0)
    }
  })
})

// ── DAY_COUNT_TYPE_LABEL ──────────────────────────────────────────────────────

describe('DAY_COUNT_TYPE_LABEL', () => {
  it('WORKING_DAY = "วันทำการ"', () => {
    expect(DAY_COUNT_TYPE_LABEL['WORKING_DAY']).toBe('วันทำการ')
  })

  it('CALENDAR_DAY = "วันปฏิทิน"', () => {
    expect(DAY_COUNT_TYPE_LABEL['CALENDAR_DAY']).toBe('วันปฏิทิน')
  })

  it('contains exactly 2 entries', () => {
    expect(Object.keys(DAY_COUNT_TYPE_LABEL)).toHaveLength(2)
  })

  it('has no blank values', () => {
    for (const v of Object.values(DAY_COUNT_TYPE_LABEL)) {
      expect(v.length).toBeGreaterThan(0)
    }
  })
})
