import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Header } from './components/layout/Header';
import { MobileTabBar, MoreSheet, Sidebar } from './components/layout/Navigation';
import { Onboarding } from './components/onboarding/Onboarding';
import { TransactionModal } from './components/transactions/TransactionModal';
import { useConfirm } from './components/ui/ConfirmDialog';
import { ToastViewport, useToast } from './components/ui/Toast';
import { type Route, useHashRoute } from './hooks/useHashRoute';
import { collectWarnings, summarizeMonthBudgets } from './lib/calculations';
import { ymOf } from './lib/dates';
import { DEFAULT_FILTERS, type TxFilters } from './lib/transactionFilters';
import { BudgetPage } from './pages/BudgetPage';
import { CashPage } from './pages/CashPage';
import { DashboardPage } from './pages/DashboardPage';
import { GoalsPage } from './pages/GoalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { useActions, useData, useI18n, useToday } from './state/store';
import { type AppUi, AppUiContext, type Intent } from './state/ui';
import type { Transaction, TransactionType } from './types';

const SEEN_KEY = 'klarissa.budget.seen-warnings';

function loadSeen(): Set<string> {
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []);
  } catch {
    return new Set();
  }
}

function saveSeen(ids: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...ids]));
  } catch {
    /* nur Komfortfunktion */
  }
}

export function App() {
  const [route, setRoute] = useHashRoute();
  const data = useData();
  const actions = useActions();
  const { t, f } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const today = useToday();

  const [intent, setIntent] = useState<Intent>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [txModal, setTxModal] = useState<{ open: boolean; tx: Transaction | null; type: TransactionType }>({
    open: false,
    tx: null,
    type: 'expense',
  });
  const [filters, setFilters] = useState<TxFilters>(DEFAULT_FILTERS);
  const [seen, setSeen] = useState<Set<string>>(loadSeen);

  const warnings = useMemo(
    () => collectWarnings(summarizeMonthBudgets(data.budgets, data.transactions, ymOf(today))),
    [data.budgets, data.transactions, today],
  );
  const unreadIds = useMemo(() => new Set(warnings.filter((w) => !seen.has(w.id)).map((w) => w.id)), [warnings, seen]);
  const markAllRead = () => {
    const next = new Set(warnings.map((warning) => warning.id));
    setSeen(next);
    saveSeen(next);
  };

  // Seitentitel, Scroll-Position und Fokus beim Seitenwechsel
  const firstRender = useRef(true);
  const needsSetup = data.account.openingBalance === null;
  useEffect(() => {
    if (!needsSetup) document.title = `${t.nav[route]} · ${t.app.name}`;
  }, [route, t, needsSetup]);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    document.getElementById('page-title')?.focus({ preventScroll: true });
  }, [route]);

  const navigate = useCallback(
    (next: Route, nextIntent: Intent = null) => {
      setIntent(nextIntent);
      setRoute(next);
    },
    [setRoute],
  );

  const deleteTransaction = useCallback(
    async (tx: Transaction) => {
      const title = tx.description || t.categories[tx.category];
      const ok = await confirm({
        title: t.confirm.deleteTxTitle,
        message: t.confirm.deleteTxText(title, f.signedMoney(tx.amount, tx.type)),
        confirmLabel: t.common.delete,
      });
      if (!ok) return;
      const removed = actions.deleteTransaction(tx.id);
      if (!removed) return;
      toast.show({
        kind: 'success',
        message: t.toasts.txDeleted,
        action: {
          label: t.common.undo,
          onClick: () => {
            actions.restoreTransaction(removed);
            toast.show({ kind: 'info', message: t.toasts.txRestored });
          },
        },
      });
    },
    [actions, confirm, f, t, toast],
  );

  const ui = useMemo<AppUi>(
    () => ({
      navigate,
      openTransaction: (tx = null, type = 'expense') => setTxModal({ open: true, tx, type }),
      deleteTransaction,
      showTransactions: (patch) => {
        setFilters({ ...DEFAULT_FILTERS, ...patch });
        navigate('transactions');
      },
      intent,
      clearIntent: () => setIntent(null),
    }),
    [navigate, deleteTransaction, intent],
  );

  const updateFilters = useCallback((patch: Partial<TxFilters>) => setFilters((current) => ({ ...current, ...patch })), []);

  // Beim ersten Start muss zuerst der Kontostand angegeben werden.
  if (needsSetup) {
    return (
      <>
        <Onboarding />
        <ToastViewport />
      </>
    );
  }

  let page: ReactNode;
  switch (route) {
    case 'transactions':
      page = <TransactionsPage filters={filters} onFiltersChange={updateFilters} />;
      break;
    case 'budget':
      page = <BudgetPage />;
      break;
    case 'statistics':
      page = <StatisticsPage />;
      break;
    case 'goals':
      page = <GoalsPage />;
      break;
    case 'cash':
      page = <CashPage />;
      break;
    case 'settings':
      page = <SettingsPage />;
      break;
    default:
      page = <DashboardPage />;
  }

  const navProps = {
    route,
    onNavigate: (next: Route) => navigate(next),
    onAddTransaction: () => ui.openTransaction(),
    warningCount: warnings.length,
  };

  return (
    <AppUiContext.Provider value={ui}>
      <a
        href="#main"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t.app.skipToContent}
      </a>

      <Sidebar {...navProps} />

      <div className="min-h-dvh lg:pl-[260px]">
        <Header
          route={route}
          onNavigate={(next) => navigate(next)}
          onAddTransaction={() => ui.openTransaction()}
          query={filters.query}
          onQueryChange={(query) => updateFilters({ query })}
          warnings={warnings}
          unreadIds={unreadIds}
          onMarkAllRead={markAllRead}
        />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-[1180px] px-4 pb-[calc(env(safe-area-inset-bottom,0px)+112px)] pt-4 outline-none sm:px-6 sm:pt-6 lg:px-10 lg:pb-16 lg:pt-8"
        >
          <div key={route} className="animate-page">
            {page}
          </div>
        </main>
      </div>

      <MobileTabBar route={route} onNavigate={(next) => navigate(next)} onOpenMore={() => setMoreOpen(true)} moreOpen={moreOpen} />
      <MoreSheet
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        route={route}
        onNavigate={(next) => navigate(next)}
        warningCount={warnings.length}
      />

      <TransactionModal
        open={txModal.open}
        transaction={txModal.tx}
        defaultType={txModal.type}
        onClose={() => setTxModal((current) => ({ ...current, open: false }))}
        onDelete={(tx) => void deleteTransaction(tx)}
      />
      <ToastViewport />
    </AppUiContext.Provider>
  );
}
