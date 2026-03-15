import { describe, it, expect } from 'vitest'
import { cn } from '../utils'

describe('cn', () => {
  it('merges multiple class strings', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('returns empty string when called with no arguments', () => {
    expect(cn()).toBe('')
  })

  it('filters out falsy values', () => {
    expect(cn('foo', undefined, null as unknown as string, false as unknown as string, 'bar')).toBe('foo bar')
  })

  it('resolves tailwind conflicts — last class wins', () => {
    // tailwind-merge deduplicates conflicting utility classes; the last one wins
    const result = cn('p-4', 'p-8')
    expect(result).toBe('p-8')
  })

  it('resolves conflicting text colors', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('keeps non-conflicting classes intact', () => {
    const result = cn('flex', 'items-center', 'gap-2')
    expect(result).toContain('flex')
    expect(result).toContain('items-center')
    expect(result).toContain('gap-2')
  })

  it('supports conditional object syntax', () => {
    const result = cn({ 'font-bold': true, 'italic': false })
    expect(result).toBe('font-bold')
    expect(result).not.toContain('italic')
  })

  it('supports array syntax', () => {
    const result = cn(['foo', 'bar'])
    expect(result).toBe('foo bar')
  })

  it('handles mixed string / object / array inputs', () => {
    const result = cn('base', { active: true }, ['extra'])
    expect(result).toContain('base')
    expect(result).toContain('active')
    expect(result).toContain('extra')
  })
})
