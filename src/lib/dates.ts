/**
 * Datums-Hilfsfunktionen. Alle Daten werden als lokales Datum im Format
 * YYYY-MM-DD gespeichert. Dadurch lassen sie sich direkt als String
 * vergleichen und sortieren – ohne Zeitzonen-Überraschungen.
 */

export interface YearMonth {
  year: number;
  /** 1–12 */
  month: number;
}

export interface DateRange {
  from: string | null;
  to: string | null;
}

export const pad2 = (n: number): string => String(n).padStart(2, '0');

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidISODate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
}

export function parseISODate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Anzahl Kalendertage von `from` bis `to`, beide eingeschlossen. */
export function daysBetweenInclusive(from: string, to: string): number {
  const ms = parseISODate(to).getTime() - parseISODate(from).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/** Montag der Woche, in der `iso` liegt. */
export function startOfWeek(iso: string): string {
  const date = parseISODate(iso);
  const offset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - offset);
  return toISODate(date);
}

export function ymOf(iso: string): YearMonth {
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) };
}

export function ymKey(ym: YearMonth): string {
  return `${ym.year}-${pad2(ym.month)}`;
}

export function addMonths(ym: YearMonth, delta: number): YearMonth {
  const index = ym.year * 12 + (ym.month - 1) + delta;
  return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

export function compareYM(a: YearMonth, b: YearMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function monthStart(ym: YearMonth): string {
  return `${ym.year}-${pad2(ym.month)}-01`;
}

export function monthEnd(ym: YearMonth): string {
  return `${ym.year}-${pad2(ym.month)}-${pad2(daysInMonth(ym.year, ym.month))}`;
}

export function monthRange(ym: YearMonth): DateRange {
  return { from: monthStart(ym), to: monthEnd(ym) };
}

export function isInRange(iso: string, range: DateRange): boolean {
  return (range.from === null || iso >= range.from) && (range.to === null || iso <= range.to);
}

export type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'lastMonth' | 'year' | 'custom';

export const PERIOD_FILTERS: PeriodFilter[] = ['all', 'today', 'week', 'month', 'lastMonth', 'year', 'custom'];

export function periodRange(period: PeriodFilter, today: string, custom?: { from: string; to: string }): DateRange {
  switch (period) {
    case 'today':
      return { from: today, to: today };
    case 'week': {
      const start = startOfWeek(today);
      return { from: start, to: addDays(start, 6) };
    }
    case 'month':
      return monthRange(ymOf(today));
    case 'lastMonth':
      return monthRange(addMonths(ymOf(today), -1));
    case 'year': {
      const year = today.slice(0, 4);
      return { from: `${year}-01-01`, to: `${year}-12-31` };
    }
    case 'custom':
      return {
        from: custom && isValidISODate(custom.from) ? custom.from : null,
        to: custom && isValidISODate(custom.to) ? custom.to : null,
      };
    default:
      return { from: null, to: null };
  }
}
