import type {
  Account,
  AppData,
  Budget,
  Currency,
  GoalColor,
  Language,
  SavingsGoal,
  Settings,
  ThemePreference,
  Transaction,
} from '../types';
import { isBudgetCategory, isCategoryOfType, isPaymentMethod } from './categories';
import { isValidISODate } from './dates';
import { isValidAmount, MAX_AMOUNT, roundMoney } from './money';

export const STORAGE_KEY = 'klarissa.budget.v1';
const BACKUP_KEY = 'klarissa.budget.corrupt-backup';
const SCHEMA_VERSION = 1;

export const CURRENCIES: readonly Currency[] = ['EUR', 'USD', 'GBP', 'CHF'];
export const THEMES: readonly ThemePreference[] = ['light', 'dark', 'system'];
export const LANGUAGES: readonly Language[] = ['de', 'en'];
export const GOAL_COLORS: readonly GoalColor[] = ['blue', 'green', 'orange', 'violet', 'magenta', 'yellow'];

export const DESCRIPTION_MAX = 120;
export const NAME_MAX = 40;
export const GOAL_NAME_MAX = 40;

export const DEFAULT_SETTINGS: Settings = {
  name: 'Max Mustermann',
  currency: 'EUR',
  theme: 'system',
  language: 'de',
};

export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const cleanText = (value: unknown, max: number): string =>
  typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';

const validTimestamp = (value: unknown): string =>
  typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : new Date().toISOString();

const validId = (value: unknown): string =>
  typeof value === 'string' && value.length > 0 && value.length <= 100 ? value : createId();

/* ------------------------------------------------------------------ */
/* Validierung einzelner Datensätze – wird beim Laden, Importieren     */
/* und vor jedem Speichern im Store angewendet.                        */
/* ------------------------------------------------------------------ */

export function sanitizeTransaction(value: unknown): Transaction | null {
  if (!isRecord(value)) return null;
  const type = value.type;
  if (type !== 'income' && type !== 'expense') return null;
  const amount = typeof value.amount === 'string' ? Number(value.amount) : value.amount;
  if (!isValidAmount(amount)) return null;
  if (!isValidISODate(value.date)) return null;
  const category = isCategoryOfType(value.category, type)
    ? value.category
    : type === 'income'
      ? 'otherIncome'
      : 'otherExpense';
  return {
    id: validId(value.id),
    type,
    amount: roundMoney(amount),
    category,
    description: cleanText(value.description, DESCRIPTION_MAX),
    date: value.date,
    paymentMethod: isPaymentMethod(value.paymentMethod) ? value.paymentMethod : null,
    createdAt: validTimestamp(value.createdAt),
  };
}

export function sanitizeBudget(value: unknown): Budget | null {
  if (!isRecord(value)) return null;
  if (!isBudgetCategory(value.category)) return null;
  const amount = typeof value.amount === 'string' ? Number(value.amount) : value.amount;
  if (!isValidAmount(amount)) return null;
  const month = Number(value.month);
  const year = Number(value.year);
  if (!Number.isInteger(month) || month < 1 || month > 12) return null;
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return null;
  return { id: validId(value.id), category: value.category, amount: roundMoney(amount), month, year };
}

export function sanitizeGoal(value: unknown): SavingsGoal | null {
  if (!isRecord(value)) return null;
  const name = cleanText(value.name, GOAL_NAME_MAX);
  if (!name) return null;
  const target = typeof value.targetAmount === 'string' ? Number(value.targetAmount) : value.targetAmount;
  if (!isValidAmount(target)) return null;
  const currentRaw = typeof value.currentAmount === 'string' ? Number(value.currentAmount) : value.currentAmount;
  const current =
    typeof currentRaw === 'number' && Number.isFinite(currentRaw) && currentRaw >= 0
      ? Math.min(roundMoney(currentRaw), MAX_AMOUNT)
      : 0;
  const color = GOAL_COLORS.includes(value.color as GoalColor) ? (value.color as GoalColor) : 'blue';
  return {
    id: validId(value.id),
    name,
    targetAmount: roundMoney(target),
    currentAmount: current,
    deadline: isValidISODate(value.deadline) ? value.deadline : null,
    createdAt: validTimestamp(value.createdAt),
    color,
  };
}

export function sanitizeSettings(value: unknown): Settings {
  if (!isRecord(value)) return { ...DEFAULT_SETTINGS };
  const name = cleanText(value.name, NAME_MAX);
  return {
    name: name || DEFAULT_SETTINGS.name,
    currency: CURRENCIES.includes(value.currency as Currency) ? (value.currency as Currency) : DEFAULT_SETTINGS.currency,
    theme: THEMES.includes(value.theme as ThemePreference) ? (value.theme as ThemePreference) : DEFAULT_SETTINGS.theme,
    language: LANGUAGES.includes(value.language as Language)
      ? (value.language as Language)
      : DEFAULT_SETTINGS.language,
  };
}

export function sanitizeAccount(value: unknown): Account {
  if (!isRecord(value)) return { openingBalance: null };
  const raw = typeof value.openingBalance === 'string' ? Number(value.openingBalance) : value.openingBalance;
  const valid = typeof raw === 'number' && Number.isFinite(raw) && Math.abs(raw) <= MAX_AMOUNT * 10;
  return { openingBalance: valid ? roundMoney(raw) : null };
}

function sanitizeList<T extends { id: string }>(
  value: unknown,
  sanitize: (item: unknown) => T | null,
): { items: T[]; dropped: number } {
  if (!Array.isArray(value)) return { items: [], dropped: value === undefined ? 0 : 1 };
  const items: T[] = [];
  const seen = new Set<string>();
  let dropped = 0;
  for (const raw of value) {
    const item = sanitize(raw);
    if (!item) {
      dropped += 1;
      continue;
    }
    if (seen.has(item.id)) item.id = createId();
    seen.add(item.id);
    items.push(item);
  }
  return { items, dropped };
}

/** Pro Kategorie und Monat ist nur ein Budget erlaubt – spätere Einträge gewinnen. */
export function dedupeBudgets(budgets: Budget[]): Budget[] {
  const byKey = new Map<string, Budget>();
  for (const budget of budgets) byKey.set(`${budget.year}-${budget.month}-${budget.category}`, budget);
  return [...byKey.values()];
}

export interface SanitizeResult {
  data: AppData;
  dropped: number;
}

/**
 * Wandelt beliebige (möglicherweise beschädigte) Rohdaten in einen gültigen
 * App-Zustand um. Gibt `null` zurück, wenn die Struktur gar nicht passt.
 */
export function sanitizeData(raw: unknown): SanitizeResult | null {
  const source = isRecord(raw) && isRecord(raw.data) ? raw.data : raw;
  if (!isRecord(source)) return null;
  const hasAnyList = ['transactions', 'budgets', 'goals'].some((key) => Array.isArray(source[key]));
  if (!hasAnyList && !isRecord(source.settings)) return null;

  const transactions = sanitizeList(source.transactions, sanitizeTransaction);
  const budgets = sanitizeList(source.budgets, sanitizeBudget);
  const goals = sanitizeList(source.goals, sanitizeGoal);

  return {
    data: {
      transactions: transactions.items,
      budgets: dedupeBudgets(budgets.items),
      goals: goals.items,
      settings: sanitizeSettings(source.settings),
      account: sanitizeAccount(source.account),
    },
    dropped: transactions.dropped + budgets.dropped + goals.dropped,
  };
}

/* ------------------------------------------------------------------ */
/* localStorage                                                        */
/* ------------------------------------------------------------------ */

export type LoadResult =
  | { status: 'ok'; data: AppData; dropped: number }
  | { status: 'empty' }
  | { status: 'corrupt' }
  | { status: 'unavailable' };

function getStorage(): Storage | null {
  try {
    const storage = window.localStorage;
    const probe = '__klarissa_probe__';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

export function loadData(): LoadResult {
  const storage = getStorage();
  if (!storage) return { status: 'unavailable' };
  let raw: string | null;
  try {
    raw = storage.getItem(STORAGE_KEY);
  } catch {
    return { status: 'unavailable' };
  }
  if (raw === null) return { status: 'empty' };
  try {
    const result = sanitizeData(JSON.parse(raw));
    if (result) return { status: 'ok', data: result.data, dropped: result.dropped };
  } catch {
    /* ungültiges JSON – wird unten behandelt */
  }
  try {
    // Beschädigte Rohdaten sichern, damit nichts endgültig verloren geht.
    storage.setItem(BACKUP_KEY, raw);
  } catch {
    /* ignorieren */
  }
  return { status: 'corrupt' };
}

export function serializeData(data: AppData): string {
  return JSON.stringify({ version: SCHEMA_VERSION, savedAt: new Date().toISOString(), data });
}

export function saveData(data: AppData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeData(data));
    return true;
  } catch {
    return false;
  }
}
