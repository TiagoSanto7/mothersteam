import { describe, expect, it } from 'vitest';
import { migrateAppState } from './useAppStore';

describe('migrateAppState', () => {
  it('maps "home" → "hoje"', () => {
    const result = migrateAppState({ activeTab: 'home' }, 0);
    expect(result.activeTab).toBe('hoje');
  });

  it('maps "baby" → "jornada"', () => {
    const result = migrateAppState({ activeTab: 'baby' }, 0);
    expect(result.activeTab).toBe('jornada');
  });

  it('maps "rotina" → "jornada"', () => {
    const result = migrateAppState({ activeTab: 'rotina' }, 0);
    expect(result.activeTab).toBe('jornada');
  });

  it('maps "shopping" → "hoje"', () => {
    const result = migrateAppState({ activeTab: 'shopping' }, 0);
    expect(result.activeTab).toBe('hoje');
  });

  it('preserves "maeIA" as hidden tab', () => {
    const result = migrateAppState({ activeTab: 'maeIA' }, 0);
    expect(result.activeTab).toBe('maeIA');
  });

  it('falls back to "hoje" for missing activeTab', () => {
    const result = migrateAppState({}, 0);
    expect(result.activeTab).toBe('hoje');
  });

  it('is a no-op for version >= 1 (returns state as-is)', () => {
    const state = { activeTab: 'home', motherName: 'Ana' };
    const result = migrateAppState(state, 1);
    expect(result).toStrictEqual(state);
  });

  it('preserves other state fields during migration', () => {
    const state = { activeTab: 'baby', motherName: 'Ana', onboardingDone: true };
    const result = migrateAppState(state, 0);
    expect(result.motherName).toBe('Ana');
    expect(result.onboardingDone).toBe(true);
  });
});
