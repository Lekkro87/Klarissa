import type { Currency, Language, Transaction } from '../types';
import { LOCALES } from './format';

export type DenominationKind = 'note' | 'coin';

export interface Denomination {
  /** Eindeutiger Schlüssel, z. B. „note-2000“ für einen 20-€-Schein */
  key: string;
  kind: DenominationKind;
  /** Wert in Cent (bzw. Pence, Rappen) */
  cents: number;
}

const note = (cents: number): Denomination => ({ key: `note-${cents}`, kind: 'note', cents });
const coin = (cents: number): Denomination => ({ key: `coin-${cents}`, kind: 'coin', cents });

/** Gängige Scheine und Münzen je Währung (absteigend nach Wert). */
export const DENOMINATIONS: Record<Currency, { notes: Denomination[]; coins: Denomination[] }> = {
  EUR: {
    notes: [50000, 20000, 10000, 5000, 2000, 1000, 500].map(note),
    coins: [200, 100, 50, 20, 10, 5, 2, 1].map(coin),
  },
  USD: {
    notes: [10000, 5000, 2000, 1000, 500, 200, 100].map(note),
    coins: [100, 50, 25, 10, 5, 1].map(coin),
  },
  GBP: {
    notes: [5000, 2000, 1000, 500].map(note),
    coins: [200, 100, 50, 20, 10, 5, 2, 1].map(coin),
  },
  CHF: {
    notes: [100000, 20000, 10000, 5000, 2000, 1000].map(note),
    coins: [500, 200, 100, 50, 20, 10, 5].map(coin),
  },
};

/** Höchstzahl pro Stückelung – schützt vor Tippfehlern. */
export const MAX_PIECES = 9999;

const SUBUNIT: Record<Currency, (cents: number) => string> = {
  EUR: (cents) => `${cents} ct`,
  USD: (cents) => `${cents}¢`,
  GBP: (cents) => `${cents}p`,
  CHF: (cents) => `${cents} Rp.`,
};

/** Beschriftung einer Stückelung, z. B. „20 €“, „50 ct“, „$5“, „25¢“. */
export function formatDenomination(cents: number, currency: Currency, language: Language): string {
  if (cents < 100) return SUBUNIT[currency](cents);
  return new Intl.NumberFormat(LOCALES[language], {
    style: 'currency',
    currency,
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

export interface CashSummary {
  total: number;
  notesTotal: number;
  coinsTotal: number;
  notesCount: number;
  coinsCount: number;
}

/** Summiert den gezählten Bargeldbestand für die Stückelungen der Währung. */
export function summarizeCash(counts: Record<string, number>, currency: Currency): CashSummary {
  const { notes, coins } = DENOMINATIONS[currency];
  let notesCents = 0;
  let coinsCents = 0;
  let notesCount = 0;
  let coinsCount = 0;
  for (const item of notes) {
    const count = counts[item.key] ?? 0;
    notesCents += count * item.cents;
    notesCount += count;
  }
  for (const item of coins) {
    const count = counts[item.key] ?? 0;
    coinsCents += count * item.cents;
    coinsCount += count;
  }
  return {
    total: (notesCents + coinsCents) / 100,
    notesTotal: notesCents / 100,
    coinsTotal: coinsCents / 100,
    notesCount,
    coinsCount,
  };
}

/** Bargeld-Zahlungen gehören nicht zum Bankkonto. */
export function affectsBankBalance(tx: Pick<Transaction, 'paymentMethod'>): boolean {
  return tx.paymentMethod !== 'cash';
}
