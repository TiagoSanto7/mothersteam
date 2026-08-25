import { describe, it, expect } from 'vitest'
import { migrateAppState } from './useAppStore'

describe('migrateAppState v2 → v3', () => {
  it('creates empty babies[] and otherChildren[] on v2 state', () => {
    const v2 = {
      activeTab: 'hoje',
      motherName: 'Ana',
      babyName: 'Sofia',
      phase: { stage: 'pregnant' as const, week: 28 },
      versesByUser: {},
    }
    const result = migrateAppState(v2 as any, 2)
    expect(result.babies).toEqual([])
    expect(result.otherChildren).toEqual([])
    expect(result.mood).toBeNull()
    expect(result.supportNetwork).toBeNull()
    expect(result.goal).toBeNull()
    expect(result.concern).toBeNull()
    expect(result.hasMultiples).toBe(false)
  })

  it('preserves existing v3 state on v3 → v3 (identity)', () => {
    const v3 = {
      babies: [{ name: 'Sofia' }],
      otherChildren: [{ name: 'Pedro', birthDate: '2023-05-14' }],
      mood: 'B' as const,
    }
    // v3+ should be returned as-is (no migration case matches)
    const result = migrateAppState(v3 as any, 3)
    expect(result.babies).toEqual([{ name: 'Sofia' }])
    expect(result.mood).toBe('B')
  })
})
