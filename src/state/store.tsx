import { createContext, type ReactNode, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { MESSAGES, type Messages } from '../i18n';
import { todayISO, type YearMonth } from '../lib/dates';
import { createDemoData } from '../lib/demoData';
import { createFormatters, type Formatters } from '../lib/format';
import { roundMoney } from '../lib/money';
import {
  createId,
  dedupeBudgets,
  loadData,
  sanitizeBudget,
  sanitizeData,
  sanitizeGoal,
  sanitizeSettings,
  sanitizeTransaction,
  saveData,
  STORAGE_KEY,
} from '../lib/storage';
import type {
  AppData,
  Budget,
  BudgetCategory,
  Language,
  SavingsGoal,
  SavingsGoalInput,
  Settings,
  Transaction,
  TransactionInput,
} from '../types';
import { useToast } from '../components/ui/Toast';

type Action =
  | { type: 'replace'; data: AppData }
  | { type: 'tx/upsert'; tx: Transaction }
  | { type: 'tx/delete'; id: string }
  | { type: 'budget/upsert'; budget: Budget }
  | { type: 'budget/addMany'; budgets: Budget[] }
  | { type: 'budget/delete'; id: string }
  | { type: 'goal/upsert'; goal: SavingsGoal }
  | { type: 'goal/delete'; id: string }
  | { type: 'settings/update'; settings: Settings };

function upsert<T extends { id: string }>(items: T[], item: T, prepend = false): T[] {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index === -1) return prepend ? [item, ...items] : [...items, item];
  const next = items.slice();
  next[index] = item;
  return next;
}

function reducer(state: AppData, action: Action): AppData {
  switch (action.type) {
    case 'replace':
      return action.data;
    case 'tx/upsert':
      return { ...state, transactions: upsert(state.transactions, action.tx, true) };
    case 'tx/delete':
      return { ...state, transactions: state.transactions.filter((tx) => tx.id !== action.id) };
    case 'budget/upsert': {
      const { budget } = action;
      // Pro Kategorie und Monat nur ein Budget
      const others = state.budgets.filter(
        (entry) =>
          entry.id === budget.id ||
          !(entry.category === budget.category && entry.month === budget.month && entry.year === budget.year),
      );
      return { ...state, budgets: upsert(others, budget) };
    }
    case 'budget/addMany':
      return { ...state, budgets: dedupeBudgets([...state.budgets, ...action.budgets]) };
    case 'budget/delete':
      return { ...state, budgets: state.budgets.filter((budget) => budget.id !== action.id) };
    case 'goal/upsert':
      return { ...state, goals: upsert(state.goals, action.goal) };
    case 'goal/delete':
      return { ...state, goals: state.goals.filter((goal) => goal.id !== action.id) };
    case 'settings/update':
      return { ...state, settings: action.settings };
    default:
      return state;
  }
}

type StartupNotice = 'corrupt' | 'unavailable' | { repaired: number } | null;

function initialize(): { data: AppData; notice: StartupNotice } {
  const result = loadData();
  switch (result.status) {
    case 'ok':
      return { data: result.data, notice: result.dropped > 0 ? { repaired: result.dropped } : null };
    case 'empty':
      // Erster Start: realistische Demo-Daten laden (Standardsprache Deutsch).
      return { data: createDemoData(todayISO(), 'de'), notice: null };
    case 'corrupt':
      return { data: createDemoData(todayISO(), 'de'), notice: 'corrupt' };
    default:
      return { data: createDemoData(todayISO(), 'de'), notice: 'unavailable' };
  }
}

export interface BudgetInput {
  category: BudgetCategory;
  amount: number;
  month: number;
  year: number;
}

export interface Actions {
  addTransaction: (input: TransactionInput) => Transaction | null;
  updateTransaction: (id: string, input: TransactionInput) => Transaction | null;
  deleteTransaction: (id: string) => Transaction | null;
  restoreTransaction: (tx: Transaction) => void;
  saveBudget: (input: BudgetInput, id?: string) => Budget | null;
  deleteBudget: (id: string) => Budget | null;
  copyBudgets: (from: YearMonth, to: YearMonth) => number;
  saveGoal: (input: SavingsGoalInput, id?: string) => SavingsGoal | null;
  deleteGoal: (id: string) => SavingsGoal | null;
  adjustGoal: (id: string, delta: number) => SavingsGoal | null;
  updateSettings: (patch: Partial<Settings>) => void;
  replaceData: (data: AppData) => void;
  resetDemo: () => void;
  clearAll: () => void;
}

interface I18nValue {
  t: Messages;
  f: Formatters;
  language: Language;
}

const DataContext = createContext<AppData | null>(null);
const ActionsContext = createContext<Actions | null>(null);
const I18nContext = createContext<I18nValue | null>(null);

/**
 * Überträgt das gewählte Farbschema auf das <html>-Element.
 * Im Modus „System“ wird ein ursprünglich vorhandenes data-theme
 * (z. B. vom einbettenden Host) wiederhergestellt.
 */
function useApplyTheme(theme: Settings['theme'], language: Language) {
  const hostTheme = useRef<string | null>(null);
  const captured = useRef(false);
  if (!captured.current && typeof document !== 'undefined') {
    hostTheme.current = document.documentElement.getAttribute('data-theme');
    captured.current = true;
  }

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      if (hostTheme.current) root.setAttribute('data-theme', hostTheme.current);
      else root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [boot] = useState(initialize);
  const [state, dispatch] = useReducer(reducer, boot.data);
  const stateRef = useRef(state);
  stateRef.current = state;
  const toast = useToast();
  const skipSave = useRef(false);
  const storageWarned = useRef(false);

  const i18n = useMemo<I18nValue>(
    () => ({
      t: MESSAGES[state.settings.language],
      f: createFormatters(state.settings.language, state.settings.currency),
      language: state.settings.language,
    }),
    [state.settings.language, state.settings.currency],
  );
  const i18nRef = useRef(i18n);
  i18nRef.current = i18n;

  useApplyTheme(state.settings.theme, state.settings.language);

  // Hinweise beim Start (beschädigte Daten, kein Speicher verfügbar …)
  useEffect(() => {
    const { t } = i18nRef.current;
    const notice = boot.notice;
    if (notice === 'corrupt') toast.show({ kind: 'warning', message: t.toasts.dataCorrupt, duration: 8000 });
    else if (notice === 'unavailable') {
      storageWarned.current = true;
      toast.show({ kind: 'warning', message: t.toasts.storageUnavailable, duration: 8000 });
    } else if (notice && typeof notice === 'object') {
      toast.show({ kind: 'info', message: t.toasts.dataRepaired(notice.repaired), duration: 7000 });
    }
  }, [boot.notice, toast]);

  // Dauerhaft speichern, sobald sich die Daten ändern
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    const ok = saveData(state);
    if (!ok && !storageWarned.current) {
      storageWarned.current = true;
      toast.show({ kind: 'error', message: i18nRef.current.t.toasts.storageError, duration: 8000 });
    }
    if (ok) storageWarned.current = false;
  }, [state, toast]);

  // Änderungen aus anderen Tabs übernehmen
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || event.newValue === null) return;
      try {
        const result = sanitizeData(JSON.parse(event.newValue));
        if (!result) return;
        skipSave.current = true;
        dispatch({ type: 'replace', data: result.data });
      } catch {
        /* ungültige Daten aus anderem Tab ignorieren */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const actions = useMemo<Actions>(() => {
    const now = () => new Date().toISOString();
    return {
      addTransaction: (input) => {
        const tx = sanitizeTransaction({ ...input, id: createId(), createdAt: now() });
        if (!tx) return null;
        dispatch({ type: 'tx/upsert', tx });
        return tx;
      },
      updateTransaction: (id, input) => {
        const existing = stateRef.current.transactions.find((tx) => tx.id === id);
        if (!existing) return null;
        const tx = sanitizeTransaction({ ...existing, ...input, id, createdAt: existing.createdAt });
        if (!tx) return null;
        dispatch({ type: 'tx/upsert', tx });
        return tx;
      },
      deleteTransaction: (id) => {
        const existing = stateRef.current.transactions.find((tx) => tx.id === id) ?? null;
        if (existing) dispatch({ type: 'tx/delete', id });
        return existing;
      },
      restoreTransaction: (tx) => {
        const valid = sanitizeTransaction(tx);
        if (valid) dispatch({ type: 'tx/upsert', tx: valid });
      },
      saveBudget: (input, id) => {
        const duplicate = stateRef.current.budgets.find(
          (budget) =>
            budget.category === input.category && budget.month === input.month && budget.year === input.year,
        );
        const budget = sanitizeBudget({ ...input, id: id ?? duplicate?.id ?? createId() });
        if (!budget) return null;
        dispatch({ type: 'budget/upsert', budget });
        return budget;
      },
      deleteBudget: (id) => {
        const existing = stateRef.current.budgets.find((budget) => budget.id === id) ?? null;
        if (existing) dispatch({ type: 'budget/delete', id });
        return existing;
      },
      copyBudgets: (from, to) => {
        const { budgets } = stateRef.current;
        const existing = new Set(
          budgets.filter((b) => b.year === to.year && b.month === to.month).map((b) => b.category),
        );
        const copies = budgets
          .filter((b) => b.year === from.year && b.month === from.month && !existing.has(b.category))
          .map((b) => ({ ...b, id: createId(), month: to.month, year: to.year }));
        if (copies.length > 0) dispatch({ type: 'budget/addMany', budgets: copies });
        return copies.length;
      },
      saveGoal: (input, id) => {
        const existing = id ? stateRef.current.goals.find((goal) => goal.id === id) : undefined;
        const goal = sanitizeGoal({
          ...input,
          id: existing?.id ?? createId(),
          createdAt: existing?.createdAt ?? now(),
        });
        if (!goal) return null;
        dispatch({ type: 'goal/upsert', goal });
        return goal;
      },
      deleteGoal: (id) => {
        const existing = stateRef.current.goals.find((goal) => goal.id === id) ?? null;
        if (existing) dispatch({ type: 'goal/delete', id });
        return existing;
      },
      adjustGoal: (id, delta) => {
        const existing = stateRef.current.goals.find((goal) => goal.id === id);
        if (!existing || !Number.isFinite(delta)) return null;
        const goal = sanitizeGoal({ ...existing, currentAmount: Math.max(0, roundMoney(existing.currentAmount + delta)) });
        if (!goal) return null;
        dispatch({ type: 'goal/upsert', goal });
        return goal;
      },
      updateSettings: (patch) => {
        dispatch({ type: 'settings/update', settings: sanitizeSettings({ ...stateRef.current.settings, ...patch }) });
      },
      replaceData: (data) => {
        const result = sanitizeData(data);
        if (result) dispatch({ type: 'replace', data: result.data });
      },
      resetDemo: () => {
        const { settings } = stateRef.current;
        dispatch({ type: 'replace', data: createDemoData(todayISO(), settings.language, settings) });
      },
      clearAll: () => {
        dispatch({ type: 'replace', data: { transactions: [], budgets: [], goals: [], settings: stateRef.current.settings } });
      },
    };
  }, []);

  return (
    <ActionsContext.Provider value={actions}>
      <DataContext.Provider value={state}>
        <I18nContext.Provider value={i18n}>{children}</I18nContext.Provider>
      </DataContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useData(): AppData {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData muss innerhalb von AppProvider verwendet werden.');
  return context;
}

export function useActions(): Actions {
  const context = useContext(ActionsContext);
  if (!context) throw new Error('useActions muss innerhalb von AppProvider verwendet werden.');
  return context;
}

export function useI18n(): I18nValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n muss innerhalb von AppProvider verwendet werden.');
  return context;
}

/** Aktuelles Datum, das sich um Mitternacht bzw. beim Zurückkehren in den Tab aktualisiert. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO);
  useEffect(() => {
    const refresh = () => setToday(todayISO());
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}

