import { describe, it, expect } from 'vitest'
import { computeProfileFromLetters } from './profile'

describe('computeProfileFromLetters — parity with frontend rules', () => {
  it('D + C = exausta_sem_apoio (maria)', () => {
    const p = computeProfileFromLetters({
      stage: 'postpartum',
      ageInDays: 60,
      mood: 'D',
      supportNetwork: 'C',
      goal: 'A',
      concern: 'A',
    })
    expect(p.profileKey).toBe('exausta_sem_apoio')
    expect(p.archetypeKey).toBe('maria')
  })

  it('C concern = desafio_amamentacao (ana)', () => {
    const p = computeProfileFromLetters({
      stage: 'postpartum',
      ageInDays: 45,
      mood: 'B',
      supportNetwork: 'A',
      goal: 'A',
      concern: 'C',
    })
    expect(p.profileKey).toBe('desafio_amamentacao')
    expect(p.archetypeKey).toBe('ana')
  })

  it('pregnant week 20 + A mood = gestante_tranquila (ester) via q1=A', () => {
    const p = computeProfileFromLetters({
      stage: 'pregnant',
      week: 20,
      mood: 'A',
      supportNetwork: 'A',
      goal: 'A',
      concern: 'A',
    })
    expect(p.profileKey).toBe('gestante_tranquila')
    expect(p.archetypeKey).toBe('ester')
  })

  it('postpartum >365 days = mae_experiente (ester) via q1=E', () => {
    const p = computeProfileFromLetters({
      stage: 'postpartum',
      ageInDays: 400,
      mood: 'A',
      supportNetwork: 'A',
      goal: 'A',
      concern: 'A',
    })
    expect(p.profileKey).toBe('mae_experiente')
    expect(p.archetypeKey).toBe('ester')
  })
})
