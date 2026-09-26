import type { Language } from '../types';

/** Höchstbetrag pro Eintrag – schützt vor Tippfehlern und unsinnigen Werten. */
export const MAX_AMOUNT = 100_000_000;

export const toCents = (value: number): number => Math.round(value * 100);

export const roundMoney = (value: number): number => Math.round(value * 100) / 100;

/** Prüft, ob ein Wert ein gültiger, positiver Geldbetrag ist. */
export function isValidAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= MAX_AMOUNT;
}

export type AmountError = 'required' | 'invalid' | 'positive' | 'tooLarge';
export type AmountParseResult = { ok: true; value: number } | { ok: false; error: AmountError };

function isThousandsGrouping(parts: string[]): boolean {
  return parts[0].length >= 1 && parts[0].length <= 3 && parts.slice(1).every((part) => part.length === 3);
}

/**
 * Liest einen vom Nutzer eingegebenen Betrag ein.
 * Akzeptiert z. B. „50“, „50,5“, „1.234,56“ (Deutsch) oder „1,234.56“ (Englisch)
 * sowie Währungssymbole und Leerzeichen. Höchstens zwei Nachkommastellen.
 */
export function parseAmount(input: string, language: Language): AmountParseResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: 'required' };

  let text = trimmed.replace(/[\s  ']/g, '').replace(/€|\$|£|CHF|EUR|USD|GBP|Fr\.?/gi, '');
  if (!text) return { ok: false, error: 'invalid' };

  let negative = false;
  if (/^[-−–]/.test(text)) {
    negative = true;
    text = text.slice(1);
  } else if (text.startsWith('+')) {
    text = text.slice(1);
  }

  if (!/^[\d.,]+$/.test(text) || !/\d/.test(text)) return { ok: false, error: 'invalid' };

  const thousandsSeparator = language === 'de' ? '.' : ',';
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  let integerPart: string;
  let fractionPart = '';

  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.';
    const thousands = decimal === ',' ? '.' : ',';
    const [head, tail, ...rest] = text.split(decimal);
    if (rest.length > 0 || tail === undefined) return { ok: false, error: 'invalid' };
    const groups = head.split(thousands);
    if (!isThousandsGrouping(groups)) return { ok: false, error: 'invalid' };
    integerPart = groups.join('');
    fractionPart = tail;
  } else if (lastComma >= 0 || lastDot >= 0) {
    const separator = lastComma >= 0 ? ',' : '.';
    const parts = text.split(separator);
    if (parts.length > 2) {
      if (!isThousandsGrouping(parts)) return { ok: false, error: 'invalid' };
      integerPart = parts.join('');
    } else if (separator === thousandsSeparator && parts[1].length === 3 && parts[0].length > 0) {
      integerPart = parts.join('');
    } else {
      integerPart = parts[0] || '0';
      fractionPart = parts[1];
    }
  } else {
    integerPart = text;
  }

  if (!/^\d+$/.test(integerPart) || !/^\d*$/.test(fractionPart)) return { ok: false, error: 'invalid' };
  if (fractionPart.length > 2) return { ok: false, error: 'invalid' };

  const value = Number(`${integerPart}.${fractionPart || '0'}`);
  if (!Number.isFinite(value)) return { ok: false, error: 'invalid' };
  if (negative || value <= 0) return { ok: false, error: 'positive' };
  if (value > MAX_AMOUNT) return { ok: false, error: 'tooLarge' };
  return { ok: true, value: roundMoney(value) };
}

export type SignedAmountResult = { ok: true; value: number } | { ok: false; error: 'required' | 'invalid' | 'tooLarge' };

/**
 * Wie `parseAmount`, erlaubt aber auch 0 und negative Werte –
 * z. B. für einen überzogenen Kontostand („−120,50“).
 */
export function parseSignedAmount(input: string, language: Language): SignedAmountResult {
  const cleaned = input.replace(/[\s\u00a0\u202f']/g, '').replace(/€|\$|£|CHF|EUR|USD|GBP|Fr\.?/gi, '');
  if (!input.trim()) return { ok: false, error: 'required' };
  if (!cleaned) return { ok: false, error: 'invalid' };
  const negative = /^[-−–]/.test(cleaned);
  const rest = negative || cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  if (/^[0.,]+$/.test(rest) && /0/.test(rest)) return { ok: true, value: 0 };
  const parsed = parseAmount(rest, language);
  if (!parsed.ok) return { ok: false, error: parsed.error === 'tooLarge' ? 'tooLarge' : 'invalid' };
  return { ok: true, value: negative ? -parsed.value : parsed.value };
}

/** Formatiert einen Betrag für ein Eingabefeld (ohne Tausendertrennzeichen). */
export function amountToInput(value: number, language: Language): string {
  const fixed = roundMoney(value).toFixed(2);
  return language === 'de' ? fixed.replace('.', ',') : fixed;
}
