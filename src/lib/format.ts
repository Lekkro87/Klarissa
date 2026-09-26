import type { Currency, Language, TransactionType } from '../types';
import { parseISODate, type YearMonth } from './dates';

export interface Formatters {
  locale: string;
  money: (value: number) => string;
  /** Betrag mit Vorzeichen je nach Typ: +3.000,00 € / −84,50 € */
  signedMoney: (value: number, type: TransactionType) => string;
  /** Kompakte Achsenbeschriftung */
  axisMoney: (value: number) => string;
  /** Wert in Prozent (0–100) */
  percent: (value: number, digits?: number) => string;
  /** Veränderung in Prozent mit Vorzeichen */
  signedPercent: (value: number, digits?: number) => string;
  number: (value: number, digits?: number) => string;
  date: (iso: string) => string;
  dateLong: (iso: string) => string;
  weekdayDate: (iso: string) => string;
  dayHeading: (iso: string) => string;
  dayMonth: (iso: string) => string;
  monthYear: (ym: YearMonth) => string;
  monthName: (ym: YearMonth) => string;
  monthShort: (ym: YearMonth) => string;
  currencySymbol: string;
}

export const LOCALES: Record<Language, string> = { de: 'de-DE', en: 'en-GB' };

const MINUS = '−';

export function createFormatters(language: Language, currency: Currency): Formatters {
  const locale = LOCALES[language];
  const money = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const moneyWhole = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 });
  const moneyCompact = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  });
  const numberCache = new Map<number, Intl.NumberFormat>();
  const numberFormat = (digits: number) => {
    let format = numberCache.get(digits);
    if (!format) {
      format = new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });
      numberCache.set(digits, format);
    }
    return format;
  };
  const date = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const dateLong = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const weekdayDate = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const dayHeading = new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'long' });
  const monthYear = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' });
  const monthName = new Intl.DateTimeFormat(locale, { month: 'long' });
  const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' });

  const symbolPart = money.formatToParts(0).find((part) => part.type === 'currency');
  const withMinus = (text: string) => text.replace('-', MINUS);
  const percentSuffix = language === 'de' ? ' %' : '%';

  return {
    locale,
    money: (value) => withMinus(money.format(value === 0 ? 0 : value)),
    signedMoney: (value, type) => `${type === 'income' ? '+' : MINUS}${money.format(Math.abs(value))}`,
    axisMoney: (value) =>
      withMinus(Math.abs(value) >= 10_000 ? moneyCompact.format(value) : moneyWhole.format(value)),
    percent: (value, digits = 1) => `${withMinus(numberFormat(digits).format(value))}${percentSuffix}`,
    signedPercent: (value, digits = 1) => {
      const rounded = Number(value.toFixed(digits));
      const sign = rounded > 0 ? '+' : rounded < 0 ? MINUS : '±';
      return `${sign}${numberFormat(digits).format(Math.abs(rounded))}${percentSuffix}`;
    },
    number: (value, digits = 0) => withMinus(numberFormat(digits).format(value)),
    date: (iso) => date.format(parseISODate(iso)),
    dateLong: (iso) => dateLong.format(parseISODate(iso)),
    weekdayDate: (iso) => weekdayDate.format(parseISODate(iso)),
    dayHeading: (iso) => dayHeading.format(parseISODate(iso)),
    dayMonth: (iso) => dayMonth.format(parseISODate(iso)),
    monthYear: (ym) => monthYear.format(new Date(ym.year, ym.month - 1, 1)),
    monthName: (ym) => monthName.format(new Date(ym.year, ym.month - 1, 1)),
    monthShort: (ym) => monthShort.format(new Date(ym.year, ym.month - 1, 1)).replace('.', ''),
    currencySymbol: symbolPart?.value ?? currency,
  };
}
