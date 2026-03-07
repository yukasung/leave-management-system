import { describe, it, expect } from 'vitest'
import { buildPolicySummary, type LeaveTypePolicy } from '../leave-policy-utils'

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
