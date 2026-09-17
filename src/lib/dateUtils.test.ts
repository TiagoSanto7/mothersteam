import { afterEach, describe, expect, it, vi } from 'vitest';
import { localDayRange, shiftISODate, startOfWeekISO, todayISO } from './dateUtils';

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

describe('todayISO', () => {
  afterEach(() => vi.useRealTimers());

  it('usa o dia local mesmo à noite, quando em UTC já é o dia seguinte', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 17, 23, 30));
    expect(todayISO()).toBe('2026-09-17');
  });
});

describe('startOfWeekISO', () => {
  it('volta para o domingo da semana, atravessando mês', () => {
    expect(startOfWeekISO('2026-09-17')).toBe('2026-09-13'); // quinta → domingo
    expect(startOfWeekISO('2026-09-13')).toBe('2026-09-13'); // domingo → ele mesmo
    expect(startOfWeekISO('2026-10-02')).toBe('2026-09-27'); // sexta de outubro → domingo de setembro
  });
});
