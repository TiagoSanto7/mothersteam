import { describe, it, expect } from 'vitest'
import { getContextualPhrase } from './helpers'
import type { PregnancyPhase } from '../types'

describe('getContextualPhrase', () => {
  it('returns trimester 1 phrase for week 8', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 8 }
    expect(getContextualPhrase(phase)).toContain('Primeiro trimestre')
  })

  it('returns trimester 2 phrase for week 20', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 20 }
    expect(getContextualPhrase(phase)).toContain('meio do caminho')
  })

  it('returns trimester 3 phrase for week 32', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 32 }
    expect(getContextualPhrase(phase)).toContain('Reta final')
  })

  it('returns pre-term phrase for week 38', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 38 }
    expect(getContextualPhrase(phase)).toContain('hora está chegando')
  })

  it('returns overdue phrase for week 42', () => {
    const phase: PregnancyPhase = { stage: 'pregnant', week: 42 }
    expect(getContextualPhrase(phase)).toContain('prestes a chegar')
  })

  it('returns newborn phrase for ageInDays 10', () => {
    const phase: PregnancyPhase = { stage: 'postpartum', ageInDays: 10 }
    expect(getContextualPhrase(phase)).toContain('mesmo exausta')
  })

  it('returns early postpartum phrase for ageInDays 60', () => {
    const phase: PregnancyPhase = { stage: 'postpartum', ageInDays: 60 }
    expect(getContextualPhrase(phase)).toContain('descobrindo o mundo')
  })

  it('returns late postpartum phrase for ageInDays 200', () => {
    const phase: PregnancyPhase = { stage: 'postpartum', ageInDays: 200 }
    expect(getContextualPhrase(phase)).toContain('até onde vocês chegaram')
  })
})
