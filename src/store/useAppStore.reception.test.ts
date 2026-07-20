import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from './useAppStore'
import type { ReceptionData } from '../types/reception'

describe('useAppStore.applyReceptionData', () => {
  beforeEach(() => {
    useAppStore.setState({
      motherName: '',
      babyName: '',
      phase: { stage: 'pregnant', week: 28 },
      onboardingDone: false,
      motherProfile: null,
    })
  })

  it('hydrates pregnant mother and computes profile', () => {
    const data: ReceptionData = {
      motherName: 'Ana',
      phase: 'pregnant',
      week: 30,
      babyName: 'Sofia',
      otherChildren: [],
      mood: 'C',
      supportNetwork: 'B',
      goal: 'C',
      concern: 'A',
    }
    useAppStore.getState().applyReceptionData(data)
    const s = useAppStore.getState()
    expect(s.motherName).toBe('Ana')
    expect(s.babyName).toBe('Sofia')
    expect(s.phase).toEqual({ stage: 'pregnant', week: 30 })
    expect(s.onboardingDone).toBe(true)
    expect(s.motherProfile).not.toBeNull()
  })

  it('hydrates postpartum mother with defaults for missing fields', () => {
    const data: ReceptionData = {
      motherName: 'Julia',
      phase: 'postpartum',
      ageInDays: 45,
      babyName: null,
      otherChildren: [],
    }
    useAppStore.getState().applyReceptionData(data)
    const s = useAppStore.getState()
    expect(s.motherName).toBe('Julia')
    expect(s.babyName).toBe('')
    expect(s.phase).toEqual({ stage: 'postpartum', ageInDays: 45 })
    expect(s.motherProfile).not.toBeNull()
  })

  it('defaults answers when reception did not capture them', () => {
    const data: ReceptionData = {
      motherName: 'Ana',
      phase: 'pregnant',
      week: 28,
      otherChildren: [],
    }
    useAppStore.getState().applyReceptionData(data)
    expect(useAppStore.getState().motherProfile).not.toBeNull()
  })
})
