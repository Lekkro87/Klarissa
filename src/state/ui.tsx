import { createContext, useContext } from 'react';
import type { Route } from '../hooks/useHashRoute';
import type { TxFilters } from '../lib/transactionFilters';
import type { Transaction, TransactionType } from '../types';

/** Absicht, die beim Seitenwechsel mitgegeben wird (z. B. direkt ein Formular öffnen). */
export type Intent = 'createBudget' | 'createGoal' | null;

export interface AppUi {
  navigate: (route: Route, intent?: Intent) => void;
  openTransaction: (tx?: Transaction | null, type?: TransactionType) => void;
  deleteTransaction: (tx: Transaction) => Promise<void>;
  /** Öffnet die Transaktionsliste mit bestimmten Filtern */
  showTransactions: (filters: Partial<TxFilters>) => void;
  intent: Intent;
  clearIntent: () => void;
}

export const AppUiContext = createContext<AppUi | null>(null);

export function useAppUi(): AppUi {
  const context = useContext(AppUiContext);
  if (!context) throw new Error('useAppUi muss innerhalb von App verwendet werden.');
  return context;
}
