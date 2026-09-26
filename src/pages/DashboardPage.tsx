import { ArrowRight, Landmark, Percent, PiggyBank, Plus, Receipt, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BudgetRow } from '../components/budget/BudgetBits';
import { CategoryDonut, IncomeExpenseChart, toDonutItems } from '../components/charts/Charts';
import { StatCard } from '../components/dashboard/StatCard';
import { GoalRow } from '../components/goals/GoalBits';
import { Amount, CategoryBubble, useTransactionTitle } from '../components/transactions/TransactionBits';
import { Button } from '../components/ui/Button';
import { Card, CardHeader } from '../components/ui/Card';
import { Delta } from '../components/ui/Delta';
import { EmptyState } from '../components/ui/EmptyState';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import {
  balanceUntil,
  categoryBreakdown,
  computeTotals,
  filterByRange,
  monthlySeries,
  percentChange,
  savingsRate,
  summarizeMonthBudgets,
} from '../lib/calculations';
import {
  addMonths,
  type DateRange,
  daysInMonth,
  monthEnd,
  monthRange,
  pad2,
  ymOf,
} from '../lib/dates';
import { useData, useI18n, useToday } from '../state/store';
import { useAppUi } from '../state/ui';

type DashboardPeriod = 'month' | 'lastMonth' | 'year' | 'all';

function periodRanges(period: DashboardPeriod, today: string): { current: DateRange; previous: DateRange | null } {
  const ym = ymOf(today);
  switch (period) {
    case 'month':
      return { current: monthRange(ym), previous: monthRange(addMonths(ym, -1)) };
    case 'lastMonth':
      return { current: monthRange(addMonths(ym, -1)), previous: monthRange(addMonths(ym, -2)) };
    case 'year': {
      const day = Math.min(Number(today.slice(8, 10)), daysInMonth(ym.year - 1, ym.month));
      return {
        current: { from: `${ym.year}-01-01`, to: `${ym.year}-12-31` },
        previous: { from: `${ym.year - 1}-01-01`, to: `${ym.year - 1}-${pad2(ym.month)}-${pad2(day)}` },
      };
    }
    default:
      return { current: { from: null, to: null }, previous: null };
  }
}

export function DashboardPage() {
  const { t, f } = useI18n();
  const data = useData();
  const ui = useAppUi();
  const today = useToday();
  const titleOf = useTransactionTitle();
  const [period, setPeriod] = useState<DashboardPeriod>('month');
  const [chartMonths, setChartMonths] = useState<'6' | '12'>('6');

  const { transactions, budgets, goals, settings } = data;
  const ym = ymOf(today);
  const firstName = settings.name.trim().split(/\s+/)[0] || settings.name;

  const metrics = useMemo(() => {
    const ranges = periodRanges(period, today);
    const inPeriod = filterByRange(transactions, ranges.current);
    const current = computeTotals(inPeriod);
    const previous = ranges.previous ? computeTotals(filterByRange(transactions, ranges.previous)) : null;
    const balance = balanceUntil(transactions);
    const balancePrevious = balanceUntil(transactions, monthEnd(addMonths(ymOf(today), -1)));
    const rate = savingsRate(current.income, current.expense);
    const previousRate = previous ? savingsRate(previous.income, previous.expense) : null;
    return {
      current,
      previous,
      balance,
      balanceChange: percentChange(balance, balancePrevious),
      rate,
      rateChange: rate !== null && previousRate !== null ? rate - previousRate : null,
      expenseCategories: categoryBreakdown(inPeriod, 'expense'),
    };
  }, [transactions, period, today]);

  const series = useMemo(
    () =>
      monthlySeries(transactions, ymOf(today), Number(chartMonths)).map((point) => {
        const pointYm = ymOf(`${point.key}-01`);
        return {
          label: f.monthShort(pointYm),
          fullLabel: f.monthYear(pointYm),
          income: point.income,
          expense: point.expense,
        };
      }),
    [transactions, today, chartMonths, f],
  );

  const monthCompare = useMemo(() => {
    const current = computeTotals(filterByRange(transactions, monthRange(ymOf(today))));
    const previous = computeTotals(filterByRange(transactions, monthRange(addMonths(ymOf(today), -1))));
    return { current, previous };
  }, [transactions, today]);

  const budgetSummary = useMemo(() => summarizeMonthBudgets(budgets, transactions, ymOf(today)), [budgets, transactions, today]);

  const recent = useMemo(
    () =>
      transactions
        .slice()
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6),
    [transactions],
  );

  const donutItems = toDonutItems(metrics.expenseCategories, (key) => t.categories[key as keyof typeof t.categories], t.common.other);

  const comparisonCaption = t.dashboard.comparison[period];
  const deltaFor = (value: number | null, upIsGood = true) =>
    value === null ? undefined : <Delta value={value} text={f.signedPercent(value)} upIsGood={upIsGood} />;
  const captionFor = (value: number | null) =>
    period === 'all' ? t.dashboard.allTimeHint(metrics.current.count) : value === null ? t.dashboard.noComparison : comparisonCaption;

  const incomeChange = metrics.previous ? percentChange(metrics.current.income, metrics.previous.income) : null;
  const expenseChange = metrics.previous ? percentChange(metrics.current.expense, metrics.previous.expense) : null;
  const rateText =
    metrics.rateChange === null
      ? null
      : t.dashboard.points(
          `${metrics.rateChange > 0.05 ? '+' : metrics.rateChange < -0.05 ? '−' : '±'}${f.number(Math.abs(metrics.rateChange), 1)}`,
        );

  const periodOptions = (['month', 'lastMonth', 'year', 'all'] as const).map((value) => ({
    value,
    label: t.dashboard.periods[value],
  }));

  const previousYm = addMonths(ym, -1);
  const shownBudgets = budgetSummary.categories.slice(0, 4);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">
            {t.dashboard.greeting(firstName)}
          </p>
          <p className="mt-1 text-muted">{t.dashboard.subtitle}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SegmentedControl
            label={t.dashboard.periodLabel}
            value={period}
            onChange={setPeriod}
            options={periodOptions}
            mobileSelect
          />
          {/* Auf dem Smartphone übernimmt der schwebende Plus-Button diese Aktion */}
          <div className="hidden sm:block">
            <Button icon={Plus} onClick={() => ui.openTransaction()}>
              {t.actions.addTransaction}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label={t.dashboard.balance}
          value={f.money(metrics.balance)}
          icon={Landmark}
          tone="primary"
          highlight
          delta={deltaFor(metrics.balanceChange)}
          caption={metrics.balanceChange === null ? t.dashboard.noComparison : t.dashboard.comparison.balance}
        />
        <StatCard
          label={t.dashboard.income}
          value={f.money(metrics.current.income)}
          icon={TrendingUp}
          tone="income"
          delta={deltaFor(incomeChange)}
          caption={captionFor(incomeChange)}
        />
        <StatCard
          label={t.dashboard.expenses}
          value={f.money(metrics.current.expense)}
          icon={TrendingDown}
          tone="expense"
          delta={deltaFor(expenseChange, false)}
          caption={captionFor(expenseChange)}
        />
        <StatCard
          label={t.dashboard.savingsRate}
          value={metrics.rate === null ? '—' : f.percent(metrics.rate)}
          icon={Percent}
          tone="neutral"
          delta={
            metrics.rateChange !== null && rateText ? <Delta value={metrics.rateChange} text={rateText} /> : undefined
          }
          caption={
            metrics.rate === null
              ? t.dashboard.noIncome
              : period === 'all'
                ? t.dashboard.savingsRateHint
                : metrics.rateChange === null
                  ? t.dashboard.noComparison
                  : comparisonCaption
          }
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title={t.dashboard.incomeVsExpenses}
            subtitle={t.dashboard.incomeVsExpensesSub}
            actions={
              <SegmentedControl
                label={t.dashboard.chartRangeLabel}
                value={chartMonths}
                onChange={setChartMonths}
                options={[
                  { value: '6', label: t.dashboard.months(6) },
                  { value: '12', label: t.dashboard.months(12) },
                ]}
              />
            }
          />
          <div className="mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            <span className="flex items-center gap-2 text-ink-2">
              <span className="size-2.5 rounded-[3px] bg-income" aria-hidden="true" />
              {t.common.income}
            </span>
            <span className="flex items-center gap-2 text-ink-2">
              <span className="size-2.5 rounded-[3px] bg-expense" aria-hidden="true" />
              {t.common.expenses}
            </span>
          </div>
          <IncomeExpenseChart data={series} />
        </Card>

        <Card>
          <CardHeader
            title={t.dashboard.monthComparison}
            subtitle={t.dashboard.monthComparisonSub(f.monthName(ym), f.monthName(previousYm))}
          />
          <ul className="space-y-5">
            {(
              [
                { key: 'income', label: t.common.income, current: monthCompare.current.income, previous: monthCompare.previous.income, color: 'var(--income)', upIsGood: true },
                { key: 'expense', label: t.common.expenses, current: monthCompare.current.expense, previous: monthCompare.previous.expense, color: 'var(--expense)', upIsGood: false },
                { key: 'net', label: t.dashboard.savings, current: monthCompare.current.net, previous: monthCompare.previous.net, color: 'var(--primary)', upIsGood: true },
              ] as const
            ).map((row) => {
              const change = percentChange(row.current, row.previous);
              const max = Math.max(Math.abs(row.current), Math.abs(row.previous), 1);
              return (
                <li key={row.key} className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-2">{row.label}</span>
                    {change === null ? (
                      <span className="text-xs text-muted">{t.dashboard.noComparison}</span>
                    ) : (
                      <Delta value={change} text={f.signedPercent(change)} upIsGood={row.upIsGood} />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {[
                      { label: f.monthShort(ym), value: row.current, strong: true },
                      { label: f.monthShort(previousYm), value: row.previous, strong: false },
                    ].map((bar) => (
                      <div key={bar.label} className="flex items-center gap-2.5">
                        <span className="w-9 shrink-0 text-xs text-muted">{bar.label}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                          <div
                            className="animate-grow h-full rounded-full transition-[width] duration-500"
                            style={{
                              width: `${(Math.max(0, bar.value) / max) * 100}%`,
                              background: row.color,
                              opacity: bar.strong ? 1 : 0.4,
                            }}
                          />
                        </div>
                        <span className={`num w-24 shrink-0 text-right text-[13px] ${bar.strong ? 'font-semibold text-ink' : 'text-muted'}`}>
                          {f.money(bar.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.dashboard.expensesByCategory} subtitle={t.dashboard.periods[period]} />
          <CategoryDonut
            items={donutItems}
            total={metrics.current.expense}
            title={t.dashboard.expensesByCategory}
            emptyText={t.dashboard.noExpensesInPeriod}
          />
        </Card>

        <Card>
          <CardHeader
            title={t.dashboard.budgetOverview}
            subtitle={t.dashboard.budgetOverviewSub(f.monthYear(ym))}
            actions={
              <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => ui.navigate('budget')}>
                {t.common.viewAll}
              </Button>
            }
          />
          {budgetSummary.amount > 0 ? (
            <div className="space-y-5">
              <div className="rounded-2xl bg-surface-2 p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-ink-2">{t.budget.monthlyBudget}</span>
                  <span className="num text-sm text-muted">
                    {t.budget.ofBudget(f.money(budgetSummary.spent), f.money(budgetSummary.amount))}
                  </span>
                </div>
                <div className="mt-2.5">
                  <div
                    className="h-2.5 overflow-hidden rounded-full"
                    style={{ background: 'color-mix(in srgb, var(--primary) 14%, var(--surface-3))' }}
                    role="progressbar"
                    aria-label={t.budget.monthlyBudget}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(Math.min(100, budgetSummary.percent))}
                  >
                    <div
                      className="animate-grow h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${Math.min(100, budgetSummary.percent)}%`,
                        background:
                          budgetSummary.level === 'ok'
                            ? 'var(--primary)'
                            : budgetSummary.level === 'warn75'
                              ? 'var(--warn)'
                              : budgetSummary.level === 'warn90'
                                ? 'var(--serious)'
                                : 'var(--danger)',
                      }}
                    />
                  </div>
                </div>
                <p className="num mt-2 text-[13px] text-muted">
                  {budgetSummary.remaining >= 0
                    ? `${t.budget.remaining}: ${f.money(budgetSummary.remaining)}`
                    : `${t.budget.exceededBy} ${f.money(budgetSummary.over)}`}
                </p>
              </div>
              {shownBudgets.length > 0 && (
                <ul className="space-y-5">
                  {shownBudgets.map((status) => (
                    <BudgetRow key={status.budget.id} status={status} />
                  ))}
                </ul>
              )}
              {budgetSummary.categories.length > shownBudgets.length && (
                <button
                  type="button"
                  onClick={() => ui.navigate('budget')}
                  className="text-sm font-semibold text-primary-text hover:underline"
                >
                  {t.dashboard.moreBudgets(budgetSummary.categories.length - shownBudgets.length)}
                </button>
              )}
            </div>
          ) : (
            <EmptyState
              compact
              icon={Wallet}
              title={t.dashboard.noBudgetsTitle}
              text={t.dashboard.noBudgetsText}
              action={
                <Button variant="soft" icon={Plus} onClick={() => ui.navigate('budget', 'createBudget')}>
                  {t.dashboard.createBudget}
                </Button>
              }
            />
          )}
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" padded={false}>
          <div className="p-5 pb-0 sm:p-6 sm:pb-0">
            <CardHeader
              className="mb-3"
              title={t.dashboard.recentTransactions}
              actions={
                <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => ui.navigate('transactions')}>
                  {t.common.viewAll}
                </Button>
              }
            />
          </div>
          {recent.length === 0 ? (
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
          ) : (
            <ul className="divide-y divide-line px-2 pb-2 sm:px-3 sm:pb-3">
              {recent.map((tx) => {
                const title = titleOf(tx);
                return (
                  <li key={tx.id}>
                    <button
                      type="button"
                      onClick={() => ui.openTransaction(tx)}
                      aria-label={t.transactions.editLabel(title)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-surface-2"
                    >
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
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={t.dashboard.savingsGoals}
            actions={
              <Button variant="ghost" size="sm" iconRight={ArrowRight} onClick={() => ui.navigate('goals')}>
                {t.common.viewAll}
              </Button>
            }
          />
          {goals.length === 0 ? (
            <EmptyState
              compact
              icon={PiggyBank}
              title={t.dashboard.noGoalsTitle}
              text={t.dashboard.noGoalsText}
              action={
                <Button variant="soft" icon={Plus} onClick={() => ui.navigate('goals', 'createGoal')}>
                  {t.dashboard.createGoal}
                </Button>
              }
            />
          ) : (
            <ul className="space-y-5">
              {goals.slice(0, 4).map((goal) => (
                <GoalRow key={goal.id} goal={goal} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
