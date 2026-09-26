import { describe, expect, it } from 'vitest';
import type { Budget, Transaction } from '../types';
import {
  balanceUntil,
  budgetLevel,
  categoryBreakdown,
  collectWarnings,
  computeTotals,
  monthlySeries,
  monthlyNeeded,
  percentChange,
  savingsRate,
  summarizeMonthBudgets,
} from './calculations';
import { addMonths, isValidISODate, periodRange, startOfWeek } from './dates';
import { createDemoData } from './demoData';
import { parseAmount, parseSignedAmount } from './money';
import { sanitizeAccount, sanitizeData, sanitizeTransaction } from './storage';
import { applyFilters, createSearchIndex, DEFAULT_FILTERS } from './transactionFilters';

let counter = 0;
const tx = (partial: Partial<Transaction>): Transaction => ({
  id: `t${++counter}`,
  type: 'expense',
  amount: 10,
  category: 'groceries',
  description: '',
  date: '2026-09-10',
  paymentMethod: 'checking',
  createdAt: `2026-09-10T10:00:${String(counter % 60).padStart(2, '0')}.000Z`,
  ...partial,
});

describe('parseAmount', () => {
  it('liest deutsche und englische Schreibweisen', () => {
    expect(parseAmount('50', 'de')).toEqual({ ok: true, value: 50 });
    expect(parseAmount('50,5', 'de')).toEqual({ ok: true, value: 50.5 });
    expect(parseAmount('1.234,56', 'de')).toEqual({ ok: true, value: 1234.56 });
    expect(parseAmount('1.234', 'de')).toEqual({ ok: true, value: 1234 });
    expect(parseAmount('1.5', 'de')).toEqual({ ok: true, value: 1.5 });
    expect(parseAmount('1,234.56', 'en')).toEqual({ ok: true, value: 1234.56 });
    expect(parseAmount('1,5', 'en')).toEqual({ ok: true, value: 1.5 });
    expect(parseAmount('€ 49,90', 'de')).toEqual({ ok: true, value: 49.9 });
  });

  it('lehnt ungültige Beträge ab', () => {
    expect(parseAmount('', 'de')).toEqual({ ok: false, error: 'required' });
    expect(parseAmount('0', 'de')).toEqual({ ok: false, error: 'positive' });
    expect(parseAmount('-5', 'de')).toEqual({ ok: false, error: 'positive' });
    expect(parseAmount('abc', 'de')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmount('12,345', 'de')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmount('1e5', 'de')).toEqual({ ok: false, error: 'invalid' });
    expect(parseAmount('999999999999', 'de')).toEqual({ ok: false, error: 'tooLarge' });
  });
});

describe('parseSignedAmount', () => {
  it('erlaubt negative Werte und 0 für den Kontostand', () => {
    expect(parseSignedAmount('2.450,80', 'de')).toEqual({ ok: true, value: 2450.8 });
    expect(parseSignedAmount('€ 2.450,80', 'de')).toEqual({ ok: true, value: 2450.8 });
    expect(parseSignedAmount('-120,50', 'de')).toEqual({ ok: true, value: -120.5 });
    expect(parseSignedAmount('−5', 'de')).toEqual({ ok: true, value: -5 });
    expect(parseSignedAmount('0', 'de')).toEqual({ ok: true, value: 0 });
    expect(parseSignedAmount('0,00', 'de')).toEqual({ ok: true, value: 0 });
    expect(parseSignedAmount('', 'de')).toEqual({ ok: false, error: 'required' });
    expect(parseSignedAmount('abc', 'de')).toEqual({ ok: false, error: 'invalid' });
    expect(parseSignedAmount('-', 'de')).toEqual({ ok: false, error: 'invalid' });
  });
});

describe('Berechnungen', () => {
  it('summiert centgenau und berechnet Kontostand und Sparquote', () => {
    const list = [
      tx({ type: 'income', amount: 0.1, category: 'salary' }),
      tx({ type: 'income', amount: 0.2, category: 'salary' }),
      tx({ amount: 0.05 }),
    ];
    const totals = computeTotals(list);
    expect(totals.income).toBe(0.3);
    expect(totals.expense).toBe(0.05);
    expect(totals.net).toBe(0.25);
    expect(balanceUntil(list)).toBe(0.25);
    expect(balanceUntil(list, undefined, 1000)).toBe(1000.25);
    expect(savingsRate(3000, 1000)).toBeCloseTo(66.667, 2);
    expect(savingsRate(0, 100)).toBeNull();
  });

  it('berechnet Veränderungen robust', () => {
    expect(percentChange(110, 100)).toBeCloseTo(10);
    expect(percentChange(0, 0)).toBe(0);
    expect(percentChange(5, 0)).toBeNull();
  });

  it('bildet Monatsreihen mit laufendem Kontostand', () => {
    const list = [
      tx({ type: 'income', amount: 100, category: 'salary', date: '2026-06-15' }),
      tx({ type: 'income', amount: 1000, category: 'salary', date: '2026-08-01' }),
      tx({ amount: 200, date: '2026-09-02' }),
    ];
    const series = monthlySeries(list, { year: 2026, month: 9 }, 2);
    expect(series.map((point) => point.key)).toEqual(['2026-08', '2026-09']);
    expect(series[0]).toMatchObject({ income: 1000, expense: 0, balance: 1100 });
    expect(series[1]).toMatchObject({ income: 0, expense: 200, balance: 900 });
    const withOpening = monthlySeries(list, { year: 2026, month: 9 }, 2, 500);
    expect(withOpening.map((point) => point.balance)).toEqual([1600, 1400]);
  });

  it('gruppiert Ausgaben nach Kategorie', () => {
    const list = [tx({ amount: 30, category: 'housing' }), tx({ amount: 10 }), tx({ amount: 60, category: 'housing' })];
    const breakdown = categoryBreakdown(list, 'expense');
    expect(breakdown[0]).toMatchObject({ category: 'housing', amount: 90, share: 90, count: 2 });
    expect(breakdown[1]).toMatchObject({ category: 'groceries', amount: 10, share: 10 });
  });
});

describe('Budgets', () => {
  it('bestimmt die Warnstufen', () => {
    expect(budgetLevel(7499, 10000)).toBe('ok');
    expect(budgetLevel(7500, 10000)).toBe('warn75');
    expect(budgetLevel(9000, 10000)).toBe('warn90');
    expect(budgetLevel(10000, 10000)).toBe('full');
    expect(budgetLevel(10001, 10000)).toBe('over');
  });

  it('fasst einen Monat zusammen und erzeugt Warnungen', () => {
    const budgets: Budget[] = [
      { id: 'b1', category: 'groceries', amount: 400, month: 9, year: 2026 },
      { id: 'b2', category: 'shopping', amount: 100, month: 9, year: 2026 },
      { id: 'b3', category: 'groceries', amount: 400, month: 8, year: 2026 },
    ];
    const list = [
      tx({ amount: 280 }),
      tx({ amount: 150, category: 'shopping' }),
      tx({ amount: 50, category: 'health' }),
      tx({ amount: 999, date: '2026-08-10' }),
    ];
    const summary = summarizeMonthBudgets(budgets, list, { year: 2026, month: 9 });
    expect(summary.isDerived).toBe(true);
    expect(summary.amount).toBe(500);
    expect(summary.spent).toBe(480);
    expect(summary.unbudgetedSpent).toBe(50);
    const groceries = summary.categories.find((status) => status.category === 'groceries');
    expect(groceries).toMatchObject({ spent: 280, remaining: 120, percent: 70, level: 'ok' });
    const shopping = summary.categories.find((status) => status.category === 'shopping');
    expect(shopping).toMatchObject({ level: 'over', over: 50 });
    const warnings = collectWarnings(summary);
    expect(warnings.map((warning) => warning.category)).toEqual(['shopping']);
  });

  it('berechnet die nötige Sparrate', () => {
    const goal = {
      id: 'g',
      name: 'Fahrrad',
      targetAmount: 1500,
      currentAmount: 750,
      deadline: '2027-02-28',
      createdAt: '',
      color: 'blue' as const,
    };
    expect(monthlyNeeded(goal, '2026-09-26')).toBe(125);
    expect(monthlyNeeded({ ...goal, deadline: null }, '2026-09-26')).toBeNull();
  });
});

describe('Datumslogik', () => {
  it('prüft Datumswerte', () => {
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2028-02-29')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate(42)).toBe(false);
  });

  it('berechnet Zeiträume', () => {
    expect(startOfWeek('2026-09-26')).toBe('2026-09-21');
    expect(periodRange('week', '2026-09-26')).toEqual({ from: '2026-09-21', to: '2026-09-27' });
    expect(periodRange('lastMonth', '2026-03-15')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
  });
});

describe('Speicher-Validierung', () => {
  it('sortiert kaputte Einträge aus', () => {
    const result = sanitizeData({
      version: 1,
      data: {
        transactions: [
          { id: 'a', type: 'expense', amount: 'NaN', category: 'groceries', date: '2026-09-01' },
          { id: 'b', type: 'income', amount: 10, category: 'unbekannt', date: '2026-09-01' },
          { id: 'c', type: 'expense', amount: -3, category: 'groceries', date: '2026-09-01' },
          { id: 'd', type: 'expense', amount: 5, category: 'groceries', date: '2026-02-30' },
        ],
        budgets: [
          { id: 'x', category: 'groceries', amount: 100, month: 9, year: 2026 },
          { id: 'y', category: 'groceries', amount: 200, month: 9, year: 2026 },
          { id: 'z', category: 'groceries', amount: 100, month: 13, year: 2026 },
        ],
        goals: [{ name: '', targetAmount: 100 }],
        settings: { currency: 'XXX', theme: 'dark', language: 'en', name: '  ' },
      },
    });
    expect(result).not.toBeNull();
    expect(result!.data.transactions).toHaveLength(1);
    expect(result!.data.transactions[0].category).toBe('otherIncome');
    expect(result!.data.budgets).toEqual([{ id: 'y', category: 'groceries', amount: 200, month: 9, year: 2026 }]);
    expect(result!.data.goals).toHaveLength(0);
    expect(result!.data.settings).toEqual({ name: 'Max Mustermann', currency: 'EUR', theme: 'dark', language: 'en' });
    expect(result!.data.account).toEqual({ openingBalance: null });
    expect(result!.dropped).toBe(5);
  });

  it('prüft Startguthaben und die Kategorie Restaurants', () => {
    expect(sanitizeAccount({ openingBalance: -120.504 })).toEqual({ openingBalance: -120.5 });
    expect(sanitizeAccount({ openingBalance: 'abc' })).toEqual({ openingBalance: null });
    expect(sanitizeAccount(undefined)).toEqual({ openingBalance: null });
    const restaurant = sanitizeTransaction({ type: 'expense', amount: 24.6, category: 'restaurants', date: '2026-09-20' });
    expect(restaurant?.category).toBe('restaurants');
    const wrongType = sanitizeTransaction({ type: 'income', amount: 10, category: 'restaurants', date: '2026-09-20' });
    expect(wrongType?.category).toBe('otherIncome');
  });

  it('erkennt unbrauchbare Daten', () => {
    expect(sanitizeData(null)).toBeNull();
    expect(sanitizeData('Text')).toBeNull();
    expect(sanitizeData({ foo: 1 })).toBeNull();
  });
});

describe('Filter und Sortierung', () => {
  const list = [
    tx({ description: 'Supermarkt REWE', amount: 84.5, date: '2026-09-25' }),
    tx({ description: 'Netflix', amount: 17.99, category: 'subscriptions', date: '2026-09-24', paymentMethod: 'creditCard' }),
    tx({ type: 'income', description: 'Gehalt', amount: 3000, category: 'salary', date: '2026-09-01' }),
    tx({ description: 'Café', amount: 4.2, category: 'leisure', date: '2026-08-30', paymentMethod: null }),
  ];
  const index = createSearchIndex(
    (category) => ({ groceries: 'Lebensmittel', subscriptions: 'Abonnements', salary: 'Gehalt', leisure: 'Freizeit' })[category as string] ?? category,
    (method) => ({ checking: 'Girokonto', creditCard: 'Kreditkarte', cash: 'Bargeld', paypal: 'PayPal', other: 'Sonstiges' })[method],
    (type) => (type === 'income' ? 'Einnahme' : 'Ausgabe'),
  );

  it('sucht in Beschreibung, Kategorie und Zahlungsmethode', () => {
    expect(applyFilters(list, { ...DEFAULT_FILTERS, query: 'supermarkt' }, '2026-09-26', index)).toHaveLength(1);
    expect(applyFilters(list, { ...DEFAULT_FILTERS, query: 'abonnements' }, '2026-09-26', index)).toHaveLength(1);
    expect(applyFilters(list, { ...DEFAULT_FILTERS, query: 'kreditkarte' }, '2026-09-26', index)).toHaveLength(1);
    expect(applyFilters(list, { ...DEFAULT_FILTERS, query: 'cafe' }, '2026-09-26', index)).toHaveLength(1);
  });

  it('kombiniert Filter und sortiert', () => {
    const month = applyFilters(list, { ...DEFAULT_FILTERS, period: 'month', type: 'expense' }, '2026-09-26', index);
    expect(month.map((item) => item.description)).toEqual(['Supermarkt REWE', 'Netflix']);
    const highest = applyFilters(list, { ...DEFAULT_FILTERS, sort: 'highest' }, '2026-09-26', index);
    expect(highest[0].description).toBe('Gehalt');
    const lowest = applyFilters(list, { ...DEFAULT_FILTERS, sort: 'lowest' }, '2026-09-26', index);
    expect(lowest[0].description).toBe('Café');
    const none = applyFilters(list, { ...DEFAULT_FILTERS, paymentMethod: 'none' }, '2026-09-26', index);
    expect(none.map((item) => item.description)).toEqual(['Café']);
  });
});

describe('Demo-Daten', () => {
  it('erzeugt gültige Daten ohne Zukunftsbuchungen', () => {
    const today = '2026-09-26';
    const data = createDemoData(today, 'de');
    expect(data.transactions.length).toBeGreaterThan(100);
    expect(data.transactions.every((item) => isValidISODate(item.date) && item.date <= today)).toBe(true);
    expect(sanitizeData(data)?.dropped).toBe(0);
    expect(data.transactions.some((item) => item.category === 'restaurants')).toBe(true);
    expect(data.budgets.some((budget) => budget.category === 'restaurants')).toBe(true);
    const summary = summarizeMonthBudgets(data.budgets, data.transactions, { year: 2026, month: 9 });
    expect(collectWarnings(summary).length).toBeGreaterThan(0);
  });
});
