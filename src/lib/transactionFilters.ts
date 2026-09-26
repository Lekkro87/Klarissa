import type { Category, PaymentMethod, Transaction, TransactionType } from '../types';
import { isCategoryOfType } from './categories';
import { isInRange, type PeriodFilter, periodRange } from './dates';

export type SortKey = 'newest' | 'oldest' | 'highest' | 'lowest';
export const SORT_KEYS: readonly SortKey[] = ['newest', 'oldest', 'highest', 'lowest'];

export interface TxFilters {
  query: string;
  period: PeriodFilter;
  from: string;
  to: string;
  type: 'all' | TransactionType;
  category: 'all' | Category;
  paymentMethod: 'all' | 'none' | PaymentMethod;
  sort: SortKey;
}

export const DEFAULT_FILTERS: TxFilters = {
  query: '',
  period: 'all',
  from: '',
  to: '',
  type: 'all',
  category: 'all',
  paymentMethod: 'all',
  sort: 'newest',
};

/** Anzahl aktiver Filter (ohne Sortierung). */
export function countActiveFilters(filters: TxFilters): number {
  let count = 0;
  if (filters.query.trim()) count += 1;
  if (filters.period !== 'all') count += 1;
  if (filters.type !== 'all') count += 1;
  if (filters.category !== 'all') count += 1;
  if (filters.paymentMethod !== 'all') count += 1;
  return count;
}

/** Kleinschreibung und Entfernen von Akzenten für eine tolerante Suche. */
export function normalizeSearch(text: string): string {
  return text.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export type SearchIndex = (tx: Transaction) => string;

/**
 * Erstellt eine Funktion, die für jede Transaktion einen (gecachten)
 * Suchtext aus Beschreibung, Kategorie, Zahlungsmethode und Betrag liefert.
 */
export function createSearchIndex(
  categoryLabel: (category: Category) => string,
  paymentLabel: (method: PaymentMethod) => string,
  typeLabel: (type: TransactionType) => string,
): SearchIndex {
  const cache = new WeakMap<Transaction, string>();
  return (tx) => {
    let text = cache.get(tx);
    if (text === undefined) {
      const amount = tx.amount.toFixed(2);
      text = normalizeSearch(
        [
          tx.description,
          categoryLabel(tx.category),
          tx.paymentMethod ? paymentLabel(tx.paymentMethod) : '',
          typeLabel(tx.type),
          amount,
          amount.replace('.', ','),
        ].join(' | '),
      );
      cache.set(tx, text);
    }
    return text;
  };
}

function compareTransactions(sort: SortKey) {
  switch (sort) {
    case 'oldest':
      return (a: Transaction, b: Transaction) =>
        a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
    case 'highest':
      return (a: Transaction, b: Transaction) => b.amount - a.amount || b.date.localeCompare(a.date);
    case 'lowest':
      return (a: Transaction, b: Transaction) => a.amount - b.amount || b.date.localeCompare(a.date);
    case 'newest':
    default:
      return (a: Transaction, b: Transaction) =>
        b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
  }
}

/** Wendet Suche, alle Filter (kombiniert) und die Sortierung an. */
export function applyFilters(
  transactions: readonly Transaction[],
  filters: TxFilters,
  today: string,
  searchIndex: SearchIndex,
): Transaction[] {
  const range = periodRange(filters.period, today, { from: filters.from, to: filters.to });
  const terms = normalizeSearch(filters.query).split(/\s+/).filter(Boolean);
  const category =
    filters.category !== 'all' && (filters.type === 'all' || isCategoryOfType(filters.category, filters.type))
      ? filters.category
      : 'all';

  const result = transactions.filter((tx) => {
    if (filters.type !== 'all' && tx.type !== filters.type) return false;
    if (category !== 'all' && tx.category !== category) return false;
    if (filters.paymentMethod === 'none' && tx.paymentMethod !== null) return false;
    if (filters.paymentMethod !== 'all' && filters.paymentMethod !== 'none' && tx.paymentMethod !== filters.paymentMethod)
      return false;
    if (!isInRange(tx.date, range)) return false;
    if (terms.length > 0) {
      const haystack = searchIndex(tx);
      if (!terms.every((term) => haystack.includes(term))) return false;
    }
    return true;
  });

  return result.sort(compareTransactions(filters.sort));
}
