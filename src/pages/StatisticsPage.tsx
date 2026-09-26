import { CalendarDays, CalendarRange, TrendingDown, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CategoryDonut, toDonutItems, TrendChart, type TrendDatum } from '../components/charts/Charts';
import { StatCard } from '../components/dashboard/StatCard';
import { Amount, CategoryBubble, useTransactionTitle } from '../components/transactions/TransactionBits';
import { Card, CardHeader, PageIntro } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { categoryBreakdown, computeTotals, dailySeries, filterByRange, monthlySeries, savingsRate } from '../lib/calculations';
import { addDays, addMonths, daysBetweenInclusive, monthStart, ymOf } from '../lib/dates';
import { useData, useI18n, useToday } from '../state/store';
import { useAppUi } from '../state/ui';
import { Receipt } from 'lucide-react';

type StatsRange = '7d' | '30d' | '6m' | '12m';
const RANGES: readonly StatsRange[] = ['7d', '30d', '6m', '12m'];

function rangeBounds(range: StatsRange, today: string) {
  if (range === '7d') return { from: addDays(today, -6), to: today, months: 0 };
  if (range === '30d') return { from: addDays(today, -29), to: today, months: 0 };
  const months = range === '6m' ? 6 : 12;
  return { from: monthStart(addMonths(ymOf(today), -(months - 1))), to: today, months };
}

export function StatisticsPage() {
  const { t, f } = useI18n();
  const { transactions } = useData();
  const ui = useAppUi();
  const today = useToday();
  const titleOf = useTransactionTitle();
  const [range, setRange] = useState<StatsRange>('6m');

  const stats = useMemo(() => {
    const bounds = rangeBounds(range, today);
    const inRange = filterByRange(transactions, { from: bounds.from, to: bounds.to });
    const totals = computeTotals(inRange);

    // Erste Transaktion begrenzt den analysierten Zeitraum (sonst würden Durchschnitte verwässert)
    let firstDate: string | null = null;
    for (const tx of transactions) if (firstDate === null || tx.date < firstDate) firstDate = tx.date;
    const effectiveFrom = firstDate && firstDate > bounds.from && firstDate <= bounds.to ? firstDate : bounds.from;
    const days = Math.max(1, daysBetweenInclusive(effectiveFrom, bounds.to));
    let months: number;
    if (bounds.months > 0) {
      const start = ymOf(effectiveFrom);
      const end = ymOf(bounds.to);
      months = Math.max(1, (end.year - start.year) * 12 + (end.month - start.month) + 1);
    } else {
      months = days / 30.4375;
    }

    const series =
      bounds.months > 0
        ? monthlySeries(transactions, ymOf(today), bounds.months).map((point) => {
            const pointYm = ymOf(`${point.key}-01`);
            return { ...point, label: f.monthShort(pointYm), fullLabel: f.monthYear(pointYm) };
          })
        : dailySeries(transactions, bounds.from, bounds.to).map((point) => ({
            ...point,
            label: f.dayMonth(point.key),
            fullLabel: f.dateLong(point.key),
          }));

    const largest = inRange
      .filter((tx) => tx.type === 'expense')
      .sort((a, b) => b.amount - a.amount || b.date.localeCompare(a.date))
      .slice(0, 8);

    return {
      totals,
      rate: savingsRate(totals.income, totals.expense),
      days,
      months,
      avgMonthly: totals.expense / months,
      avgDaily: totals.expense / days,
      income: series.map<TrendDatum>((point) => ({ label: point.label, fullLabel: point.fullLabel, value: point.income })),
      expense: series.map<TrendDatum>((point) => ({ label: point.label, fullLabel: point.fullLabel, value: point.expense })),
      balance: series.map<TrendDatum>((point) => ({ label: point.label, fullLabel: point.fullLabel, value: point.balance })),
      expenseCategories: categoryBreakdown(inRange, 'expense'),
      incomeCategories: categoryBreakdown(inRange, 'income'),
      largest,
    };
  }, [transactions, range, today, f]);

  const monthsText = f.number(stats.months, Number.isInteger(stats.months) ? 0 : 1);
  const categoryLabel = (key: string) => t.categories[key as keyof typeof t.categories];

  return (
    <div className="space-y-6">
      <PageIntro
        title={t.nav.statistics}
        subtitle={t.statistics.subtitle}
        actions={
          <SegmentedControl
            label={t.statistics.rangeLabel}
            value={range}
            onChange={setRange}
            options={RANGES.map((value) => ({ value, label: t.statistics.ranges[value] }))}
            mobileSelect
          />
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.statistics.totalIncome}
          value={f.money(stats.totals.income)}
          icon={TrendingUp}
          tone="income"
          caption={t.statistics.ranges[range]}
        />
        <StatCard
          label={t.statistics.totalExpenses}
          value={f.money(stats.totals.expense)}
          icon={TrendingDown}
          tone="expense"
          caption={
            stats.rate === null
              ? t.statistics.ranges[range]
              : `${t.statistics.savedInRange(f.money(stats.totals.net))} · ${t.statistics.rateInRange(f.percent(stats.rate))}`
          }
        />
        <StatCard
          label={t.statistics.avgMonthly}
          value={f.money(stats.avgMonthly)}
          icon={CalendarRange}
          tone="primary"
          caption={t.statistics.avgMonthlyHint(monthsText)}
        />
        <StatCard
          label={t.statistics.avgDaily}
          value={f.money(stats.avgDaily)}
          icon={CalendarDays}
          tone="neutral"
          caption={t.statistics.avgDailyHint(stats.days)}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.statistics.incomeOverTime} subtitle={t.statistics.sum(f.money(stats.totals.income))} />
          <TrendChart data={stats.income} color="var(--income)" name={t.common.income} emptyText={t.statistics.noIncome} />
        </Card>
        <Card>
          <CardHeader title={t.statistics.expensesOverTime} subtitle={t.statistics.sum(f.money(stats.totals.expense))} />
          <TrendChart data={stats.expense} color="var(--expense)" name={t.common.expenses} emptyText={t.statistics.noExpenses} />
        </Card>
      </div>

      <Card>
        <CardHeader title={t.statistics.balanceTrend} subtitle={t.statistics.balanceTrendSub} />
        <TrendChart
          data={stats.balance}
          color="var(--primary)"
          name={t.common.balance}
          emptyText={t.statistics.noExpenses}
          height={260}
          allowZeroOnly={transactions.length > 0}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.statistics.expensesByCategory} subtitle={t.statistics.ranges[range]} />
          <CategoryDonut
            items={toDonutItems(stats.expenseCategories, categoryLabel, t.common.other)}
            total={stats.totals.expense}
            title={t.statistics.expensesByCategory}
            emptyText={t.statistics.noExpenses}
          />
        </Card>
        <Card>
          <CardHeader title={t.statistics.incomeByCategory} subtitle={t.statistics.ranges[range]} />
          <CategoryDonut
            items={toDonutItems(stats.incomeCategories, categoryLabel, t.common.other)}
            total={stats.totals.income}
            title={t.statistics.incomeByCategory}
            emptyText={t.statistics.noIncome}
          />
        </Card>
      </div>

      <Card padded={false}>
        <div className="p-5 pb-0 sm:p-6 sm:pb-0">
          <CardHeader className="mb-3" title={t.statistics.largestExpenses} subtitle={t.statistics.largestExpensesSub} />
        </div>
        {stats.largest.length === 0 ? (
          <EmptyState compact icon={Receipt} title={t.statistics.noExpenses} />
        ) : (
          <ol className="divide-y divide-line px-2 pb-2 sm:px-3 sm:pb-3">
            {stats.largest.map((tx, index) => {
              const title = titleOf(tx);
              return (
                <li key={tx.id}>
                  <button
                    type="button"
                    onClick={() => ui.openTransaction(tx)}
                    aria-label={`${index + 1}. ${t.transactions.editLabel(title)}`}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2"
                  >
                    <span className="num w-6 shrink-0 text-center font-display text-sm font-semibold text-muted">{index + 1}</span>
                    <CategoryBubble category={tx.category} type={tx.type} />
                    <span className="min-w-0 flex-1">
                      <span className={`block truncate font-semibold ${tx.description ? 'text-ink' : 'text-muted'}`}>{title}</span>
                      <span className="block truncate text-[13px] text-muted">
                        {t.categories[tx.category]} · {f.date(tx.date)}
                      </span>
                    </span>
                    <Amount amount={tx.amount} type={tx.type} />
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </Card>
    </div>
  );
}
