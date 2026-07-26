export const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
export const MONTHS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Parses an ISO date string (YYYY-MM-DD) at local noon to avoid UTC-shift. */
export function parseLocalDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

/** "Qua, 30 jul" */
export function formatShortDate(iso: string): string {
  const d = parseLocalDate(iso);
  return `${DAYS_PT[d.getDay()]}, ${d.getDate()} ${MONTHS_PT[d.getMonth()]}`;
}

/** "quarta-feira, 30 de julho" (full weekday + day + month) */
export function formatDateHeading(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/** "quarta-feira, 30 de julho de 2025" (full, with year) */
export function formatDateFull(iso: string): string {
  return parseLocalDate(iso).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "30 jul" (compact, no weekday) */
export function formatDateCompact(iso: string): string {
  const d = parseLocalDate(iso);
  return `${d.getDate()} ${MONTHS_PT[d.getMonth()]}`;
}

/** Returns today as YYYY-MM-DD local time. */
export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
