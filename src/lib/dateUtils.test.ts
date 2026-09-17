import { describe, expect, it } from 'vitest';
import { localDayRange, shiftISODate } from './dateUtils';

describe('shiftISODate', () => {
  it('volta e avança dias atravessando mês e ano', () => {
    expect(shiftISODate('2026-09-17', -1)).toBe('2026-09-16');
    expect(shiftISODate('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftISODate('2026-12-31', 1)).toBe('2027-01-01');
  });
});

describe('localDayRange', () => {
  it('cobre exatamente o dia local, da meia-noite até a meia-noite seguinte', () => {
    const { from, to } = localDayRange('2026-09-17');
    expect(new Date(from).getTime()).toBe(new Date(2026, 8, 17).getTime());
    expect(new Date(to).getTime()).toBe(new Date(2026, 8, 18).getTime());
  });
});
