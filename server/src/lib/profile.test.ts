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

  it('sobrecarregada_amparada (maria): postpartum 60 days, mood=D, support=B → q2=D && q3≠C', () => {
    const p = computeProfileFromLetters({
      stage: 'postpartum',
      ageInDays: 60,
      mood: 'D',
      supportNetwork: 'B',
      goal: 'A',
      concern: 'A',
    })
    expect(p.profileKey).toBe('sobrecarregada_amparada')
    expect(p.archetypeKey).toBe('maria')
  })

  it('mae_solo (ana): postpartum 100 days, mood=A, support=C → q3=C && q1=D', () => {
    const p = computeProfileFromLetters({
      stage: 'postpartum',
      ageInDays: 100,
      mood: 'A',
      supportNetwork: 'C',
      goal: 'A',
      concern: 'A',
    })
    expect(p.profileKey).toBe('mae_solo')
    expect(p.archetypeKey).toBe('ana')
  })

  it('mae_busca_si_mesma (rute): postpartum 60 days, mood=A, support=A, goal=A, concern=A → q5=A falls to rule 11', () => {
    // Note: mae_em_jornada (default branch) is unreachable because rule 11 covers q5=A|D before
    // the default. This test covers rule 11 (mae_busca_si_mesma) with the spec's intended inputs.
    const p = computeProfileFromLetters({
      stage: 'postpartum',
      ageInDays: 60,
      mood: 'A',
      supportNetwork: 'A',
      goal: 'A',
      concern: 'A',
    })
    expect(p.profileKey).toBe('mae_busca_si_mesma')
    expect(p.archetypeKey).toBe('rute')
  })
})
