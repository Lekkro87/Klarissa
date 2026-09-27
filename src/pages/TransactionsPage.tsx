import { Plus, Receipt, SearchX } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FilterBar } from '../components/transactions/FilterBar';
import { Pagination, TransactionList } from '../components/transactions/TransactionList';
import { Button } from '../components/ui/Button';
import { Card, PageIntro } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { computeTotals } from '../lib/calculations';
import { applyFilters, createSearchIndex, DEFAULT_FILTERS, type TxFilters } from '../lib/transactionFilters';
import { useData, useI18n, useToday } from '../state/store';
import { useAppUi } from '../state/ui';

const PAGE_SIZE = 20;

interface TransactionsPageProps {
  filters: TxFilters;
  onFiltersChange: (patch: Partial<TxFilters>) => void;
}

export function TransactionsPage({ filters, onFiltersChange }: TransactionsPageProps) {
  const { t, f, language } = useI18n();
  const { transactions } = useData();
  const ui = useAppUi();
  const today = useToday();
  const [page, setPage] = useState(1);
  const listTop = useRef<HTMLDivElement>(null);

  const searchIndex = useMemo(
    () =>
      createSearchIndex(
        (category) => t.categories[category],
        (method) => t.paymentMethods[method],
        (type) => (type === 'income' ? t.common.incomeSingular : t.common.expenseSingular),
      ),
    // Der Index hängt nur von der Sprache ab; `t` wechselt gemeinsam mit ihr.
    [language],
  );

  const filtered = useMemo(
    () => applyFilters(transactions, filters, today, searchIndex),
    [transactions, filters, today, searchIndex],
  );
  const totals = useMemo(() => computeTotals(filtered), [filtered]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Bei geänderten Filtern zurück auf Seite 1
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const changePage = (next: number) => {
    setPage(next);
    listTop.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const hasAny = transactions.length > 0;

  return (
    <div className="space-y-6">
      <PageIntro
        title={t.nav.transactions}
        subtitle={t.transactions.subtitle}
        actions={
          <div className="hidden md:block lg:hidden">
            <Button icon={Plus} onClick={() => ui.openTransaction()}>
              {t.actions.addTransaction}
            </Button>
          </div>
        }
      />

      {!hasAny ? (
        <Card>
          <EmptyState
            icon={Receipt}
            title={t.transactions.emptyTitle}
            text={t.transactions.emptyText}
            action={
              <Button icon={Plus} onClick={() => ui.openTransaction()}>
                {t.transactions.emptyAction}
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <FilterBar filters={filters} onChange={onFiltersChange} />

          <div ref={listTop} className="grid scroll-mt-24 grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryTile label={t.transactions.countLabel} value={f.number(filtered.length)} />
            <SummaryTile label={t.common.income} value={f.signedMoney(totals.income, 'income')} tone="income" />
            <SummaryTile label={t.common.expenses} value={f.signedMoney(totals.expense, 'expense')} tone="expense" />
            <SummaryTile label={t.common.balance} value={f.money(totals.net)} />
          </div>

          <Card padded={false} className="overflow-clip max-md:rounded-none max-md:bg-transparent">
            {filtered.length === 0 ? (
              <EmptyState
                icon={SearchX}
                title={t.transactions.noResultsTitle}
                text={t.transactions.noResultsText}
                action={
                  <Button variant="secondary" onClick={() => onFiltersChange({ ...DEFAULT_FILTERS, sort: filters.sort })}>
                    {t.transactions.filters.reset}
                  </Button>
                }
              />
            ) : (
              <>
                <TransactionList
                  transactions={visible}
                  onEdit={(tx) => ui.openTransaction(tx)}
                  onDelete={ui.deleteTransaction}
                  groupByDate={filters.sort === 'newest' || filters.sort === 'oldest'}
                />
                <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={changePage} />
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone }: { label: string; value: string; tone?: 'income' | 'expense' }) {
  return (
    <div className="min-w-0 rounded-[16px] bg-surface px-4 py-3">
      <p className="truncate text-[13px] text-muted">{label}</p>
      <p
        className={`num mt-0.5 truncate font-display text-[20px] font-semibold tracking-[-0.02em] ${
          tone === 'income' ? 'text-income-ink' : tone === 'expense' ? 'text-expense-ink' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
