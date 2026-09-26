import type { Budget, Category, ExpenseCategory, SavingsGoal, Transaction, TransactionType } from '../types';
import {
  addDays,
  addMonths,
  daysBetweenInclusive,
  type DateRange,
  isInRange,
  monthStart,
  type YearMonth,
  ymKey,
  ymOf,
} from './dates';
import { affectsBankBalance } from './cash';
import { toCents } from './money';

/*
 * Alle Summen werden in ganzen Cent gebildet, damit keine
 * Rundungsfehler durch Gleitkomma-Arithmetik entstehen.
 */

export interface Totals {
  income: number;
  expense: number;
  net: number;
  count: number;
}

export function computeTotals(transactions: readonly Transaction[]): Totals {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.type === 'income') income += toCents(tx.amount);
    else expense += toCents(tx.amount);
  }
  return { income: income / 100, expense: expense / 100, net: (income - expense) / 100, count: transactions.length };
}

export function filterByRange(transactions: readonly Transaction[], range: DateRange): Transaction[] {
  if (range.from === null && range.to === null) return transactions.slice();
  return transactions.filter((tx) => isInRange(tx.date, range));
}

/**
 * Kontostand (Bankkonto) = Startguthaben + Einnahmen − Ausgaben
 * (optional nur bis einschließlich `untilISO`). Bargeld-Zahlungen
 * zählen nicht dazu – Bargeld wird separat geführt.
 */
export function balanceUntil(transactions: readonly Transaction[], untilISO?: string, opening = 0): number {
  let cents = toCents(opening);
  for (const tx of transactions) {
    if (!affectsBankBalance(tx)) continue;
    if (untilISO !== undefined && tx.date > untilISO) continue;
    cents += tx.type === 'income' ? toCents(tx.amount) : -toCents(tx.amount);
  }
  return cents / 100;
}

/** Sparquote in Prozent: (Einnahmen − Ausgaben) / Einnahmen × 100. `null`, wenn keine Einnahmen. */
export function savingsRate(income: number, expense: number): number | null {
  if (income <= 0) return null;
  return ((income - expense) / income) * 100;
}

/** Relative Veränderung in Prozent. `null`, wenn kein sinnvoller Vergleichswert existiert. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export interface SeriesPoint {
  key: string;
  income: number;
  expense: number;
  net: number;
  /** Kontostand des Bankkontos am Ende des Abschnitts (ohne Bargeld) */
  balance: number;
}

function buildSeries(
  transactions: readonly Transaction[],
  keys: string[],
  keyOf: (tx: Transaction) => string,
  firstKeyStart: string,
  opening: number,
): SeriesPoint[] {
  const buckets = new Map<string, { income: number; expense: number; bank: number }>();
  for (const key of keys) buckets.set(key, { income: 0, expense: 0, bank: 0 });

  let openingBalance = toCents(opening);
  for (const tx of transactions) {
    const cents = toCents(tx.amount);
    const signed = tx.type === 'income' ? cents : -cents;
    const bank = affectsBankBalance(tx);
    if (tx.date < firstKeyStart) {
      if (bank) openingBalance += signed;
      continue;
    }
    const bucket = buckets.get(keyOf(tx));
    if (!bucket) continue;
    if (tx.type === 'income') bucket.income += cents;
    else bucket.expense += cents;
    if (bank) bucket.bank += signed;
  }

  let running = openingBalance;
  return keys.map((key) => {
    const bucket = buckets.get(key) ?? { income: 0, expense: 0, bank: 0 };
    running += bucket.bank;
    return {
      key,
      income: bucket.income / 100,
      expense: bucket.expense / 100,
      net: (bucket.income - bucket.expense) / 100,
      balance: running / 100,
    };
  });
}

/** Monatliche Summen für `count` Monate, die mit `end` enden. */
export function monthlySeries(
  transactions: readonly Transaction[],
  end: YearMonth,
  count: number,
  opening = 0,
): SeriesPoint[] {
  const start = addMonths(end, -(count - 1));
  const keys = Array.from({ length: count }, (_, index) => ymKey(addMonths(start, index)));
  return buildSeries(transactions, keys, (tx) => tx.date.slice(0, 7), monthStart(start), opening);
}

/** Tägliche Summen von `from` bis `to` (beide eingeschlossen). */
export function dailySeries(transactions: readonly Transaction[], from: string, to: string, opening = 0): SeriesPoint[] {
  const days = Math.max(1, daysBetweenInclusive(from, to));
  const keys = Array.from({ length: days }, (_, index) => addDays(from, index));
  return buildSeries(transactions, keys, (tx) => tx.date, from, opening);
}

export interface CategoryShare {
  category: Category;
  amount: number;
  /** Anteil in Prozent (0–100) */
  share: number;
  count: number;
}

export function categoryBreakdown(transactions: readonly Transaction[], type: TransactionType): CategoryShare[] {
  const totals = new Map<Category, { cents: number; count: number }>();
  let sum = 0;
  for (const tx of transactions) {
    if (tx.type !== type) continue;
    const cents = toCents(tx.amount);
    const entry = totals.get(tx.category) ?? { cents: 0, count: 0 };
    entry.cents += cents;
    entry.count += 1;
    totals.set(tx.category, entry);
    sum += cents;
  }
  return [...totals.entries()]
    .map(([category, entry]) => ({
      category,
      amount: entry.cents / 100,
      share: sum > 0 ? (entry.cents / sum) * 100 : 0,
      count: entry.count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */

export type BudgetLevel = 'ok' | 'warn75' | 'warn90' | 'full' | 'over';

export const LEVEL_RANK: Record<BudgetLevel, number> = { ok: 0, warn75: 1, warn90: 2, full: 3, over: 4 };

export function budgetLevel(spentCents: number, budgetCents: number): BudgetLevel {
  if (budgetCents <= 0) return 'ok';
  if (spentCents > budgetCents) return 'over';
  if (spentCents === budgetCents) return 'full';
  const ratio = spentCents / budgetCents;
  if (ratio >= 0.9) return 'warn90';
  if (ratio >= 0.75) return 'warn75';
  return 'ok';
}

export interface BudgetStatus {
  budget: Budget;
  category: ExpenseCategory;
  spent: number;
  remaining: number;
  /** Verbrauch in Prozent, kann über 100 liegen */
  percent: number;
  level: BudgetLevel;
  /** Betrag der Überschreitung (0, wenn nicht überschritten) */
  over: number;
}

export interface MonthlyBudgetSummary {
  /** Explizit gesetztes Monatsbudget, falls vorhanden */
  totalBudget: Budget | null;
  /** Explizites Monatsbudget oder – falls keins gesetzt – Summe der Kategoriebudgets */
  amount: number;
  isDerived: boolean;
  /** Alle Ausgaben des Monats */
  spent: number;
  remaining: number;
  percent: number;
  level: BudgetLevel;
  over: number;
  /** Ausgaben in Kategorien ohne eigenes Budget */
  unbudgetedSpent: number;
  categories: BudgetStatus[];
  /** Kategorien mit Ausgaben, aber ohne Budget – absteigend nach Betrag */
  unbudgetedCategories: { category: ExpenseCategory; amount: number }[];
}

export function budgetsForMonth(budgets: readonly Budget[], ym: YearMonth): Budget[] {
  return budgets.filter((budget) => budget.year === ym.year && budget.month === ym.month);
}

export function expensesByCategoryInMonth(
  transactions: readonly Transaction[],
  ym: YearMonth,
): { byCategory: Map<ExpenseCategory, number>; totalCents: number } {
  const key = ymKey(ym);
  const byCategory = new Map<ExpenseCategory, number>();
  let totalCents = 0;
  for (const tx of transactions) {
    if (tx.type !== 'expense' || tx.date.slice(0, 7) !== key) continue;
    const cents = toCents(tx.amount);
    const category = tx.category as ExpenseCategory;
    byCategory.set(category, (byCategory.get(category) ?? 0) + cents);
    totalCents += cents;
  }
  return { byCategory, totalCents };
}

export function summarizeMonthBudgets(
  budgets: readonly Budget[],
  transactions: readonly Transaction[],
  ym: YearMonth,
): MonthlyBudgetSummary {
  const monthBudgets = budgetsForMonth(budgets, ym);
  const { byCategory, totalCents } = expensesByCategoryInMonth(transactions, ym);

  const totalBudget = monthBudgets.find((budget) => budget.category === 'total') ?? null;
  const categoryBudgets = monthBudgets.filter(
    (budget): budget is Budget & { category: ExpenseCategory } => budget.category !== 'total',
  );

  const categories: BudgetStatus[] = categoryBudgets.map((budget) => {
    const spentCents = byCategory.get(budget.category) ?? 0;
    const budgetCents = toCents(budget.amount);
    return {
      budget,
      category: budget.category,
      spent: spentCents / 100,
      remaining: (budgetCents - spentCents) / 100,
      percent: budgetCents > 0 ? (spentCents / budgetCents) * 100 : 0,
      level: budgetLevel(spentCents, budgetCents),
      over: Math.max(0, spentCents - budgetCents) / 100,
    };
  });
  categories.sort((a, b) => b.percent - a.percent);

  const budgeted = new Set(categoryBudgets.map((budget) => budget.category));
  let unbudgetedCents = 0;
  const unbudgetedCategories: { category: ExpenseCategory; amount: number }[] = [];
  for (const [category, cents] of byCategory) {
    if (budgeted.has(category)) continue;
    unbudgetedCents += cents;
    unbudgetedCategories.push({ category, amount: cents / 100 });
  }
  unbudgetedCategories.sort((a, b) => b.amount - a.amount);

  const derivedCents = categoryBudgets.reduce((sum, budget) => sum + toCents(budget.amount), 0);
  const amountCents = totalBudget ? toCents(totalBudget.amount) : derivedCents;

  return {
    totalBudget,
    amount: amountCents / 100,
    isDerived: !totalBudget,
    spent: totalCents / 100,
    remaining: (amountCents - totalCents) / 100,
    percent: amountCents > 0 ? (totalCents / amountCents) * 100 : 0,
    level: budgetLevel(totalCents, amountCents),
    over: Math.max(0, totalCents - amountCents) / 100,
    unbudgetedSpent: unbudgetedCents / 100,
    categories,
    unbudgetedCategories,
  };
}

export interface BudgetWarning {
  /** Stabiler Schlüssel: Budget-ID + Stufe */
  id: string;
  budgetId: string;
  category: ExpenseCategory | 'total';
  level: Exclude<BudgetLevel, 'ok'>;
  percent: number;
  remaining: number;
  over: number;
}

export function collectWarnings(summary: MonthlyBudgetSummary): BudgetWarning[] {
  const warnings: BudgetWarning[] = [];
  if (summary.totalBudget && summary.level !== 'ok') {
    warnings.push({
      id: `${summary.totalBudget.id}:${summary.level}`,
      budgetId: summary.totalBudget.id,
      category: 'total',
      level: summary.level,
      percent: summary.percent,
      remaining: summary.remaining,
      over: summary.over,
    });
  }
  for (const status of summary.categories) {
    if (status.level === 'ok') continue;
    warnings.push({
      id: `${status.budget.id}:${status.level}`,
      budgetId: status.budget.id,
      category: status.category,
      level: status.level,
      percent: status.percent,
      remaining: status.remaining,
      over: status.over,
    });
  }
  return warnings.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || b.percent - a.percent);
}

/* ------------------------------------------------------------------ */
/* Sparziele                                                           */
/* ------------------------------------------------------------------ */

export function goalProgress(goal: SavingsGoal): number {
  if (goal.targetAmount <= 0) return 0;
  return (goal.currentAmount / goal.targetAmount) * 100;
}

/** Monatlich nötiger Betrag, um das Ziel bis zum Zieldatum zu erreichen. */
export function monthlyNeeded(goal: SavingsGoal, today: string): number | null {
  if (!goal.deadline) return null;
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0 || goal.deadline < today) return null;
  const now = ymOf(today);
  const end = ymOf(goal.deadline);
  const months = Math.max(1, (end.year - now.year) * 12 + (end.month - now.month) + 1);
  return Math.ceil((remaining / months) * 100) / 100;
}
