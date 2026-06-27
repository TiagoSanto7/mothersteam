import { describe, it, expect } from 'vitest';
import { getEvolutionStage, getHeaderGreeting } from './pregnancyUtils';

describe('getEvolutionStage', () => {
  it('returns embryo for weeks 1–8', () => {
    expect(getEvolutionStage({ stage: 'pregnant', week: 1 })).toBe('embryo');
    expect(getEvolutionStage({ stage: 'pregnant', week: 8 })).toBe('embryo');
  });
  it('returns fetus-early for weeks 9–20', () => {
    expect(getEvolutionStage({ stage: 'pregnant', week: 9 })).toBe('fetus-early');
    expect(getEvolutionStage({ stage: 'pregnant', week: 20 })).toBe('fetus-early');
  });
  it('returns fetus-late for weeks 21–40', () => {
    expect(getEvolutionStage({ stage: 'pregnant', week: 21 })).toBe('fetus-late');
    expect(getEvolutionStage({ stage: 'pregnant', week: 40 })).toBe('fetus-late');
  });
  it('returns newborn for postpartum', () => {
    expect(getEvolutionStage({ stage: 'postpartum', ageInDays: 7 })).toBe('newborn');
  });
});

describe('getHeaderGreeting', () => {
  it('shows remaining weeks for pregnant (plural)', () => {
    expect(getHeaderGreeting({ stage: 'pregnant', week: 36 }, 'Mariana', 'Léo'))
      .toBe('Olá, Mariana! Faltam 4 semanas para o parto');
  });
  it('shows 1 week singular', () => {
    expect(getHeaderGreeting({ stage: 'pregnant', week: 39 }, 'Ana', 'Léo'))
      .toBe('Olá, Ana! Falta 1 semana para o parto');
  });
  it('shows weeks for postpartum', () => {
    expect(getHeaderGreeting({ stage: 'postpartum', ageInDays: 21 }, 'Mariana', 'Léo'))
      .toBe('Mariana, o Léo já está com 3 semanas!');
  });
  it('shows days when under 1 week', () => {
    expect(getHeaderGreeting({ stage: 'postpartum', ageInDays: 5 }, 'Mariana', 'Léo'))
      .toBe('Mariana, o Léo já está com 5 dias!');
  });
});
