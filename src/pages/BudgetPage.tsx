import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Copy,
  Pencil,
  Plus,
  Trash2,
  TriangleAlert,
  Wallet,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { BudgetCard, StatusPill } from '../components/budget/BudgetBits';
import { type BudgetModalMode, BudgetModal } from '../components/budget/BudgetModal';
import { useWarningMessage } from '../components/budget/warningText';
import { Button, IconButton } from '../components/ui/Button';
import { Card, CardHeader, PageIntro } from '../components/ui/Card';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { LEVEL_COLORS } from '../components/ui/ProgressBar';
import { RingProgress } from '../components/ui/RingProgress';
import { useToast } from '../components/ui/Toast';
import { budgetsForMonth, collectWarnings, summarizeMonthBudgets } from '../lib/calculations';
import { CATEGORY_ICONS } from '../lib/categories';
import { addMonths, compareYM, daysInMonth, type YearMonth, ymOf } from '../lib/dates';
import { useActions, useData, useI18n, useToday } from '../state/store';
import { useAppUi } from '../state/ui';
import type { Budget } from '../types';

export function BudgetPage() {
  const { t, f } = useI18n();
  const { budgets, transactions } = useData();
  const actions = useActions();
  const toast = useToast();
  const confirm = useConfirm();
  const ui = useAppUi();
  const today = useToday();
  const warningMessage = useWarningMessage();
  const currentYm = ymOf(today);
  const [ym, setYm] = useState<YearMonth>(currentYm);
  const [modal, setModal] = useState<BudgetModalMode | null>(null);

  // Vom Dashboard aus direkt „Budget erstellen“ öffnen
  useEffect(() => {
    if (ui.intent === 'createBudget') {
      setModal({ kind: 'category' });
      ui.clearIntent();
    }
  }, [ui]);

  const summary = useMemo(() => summarizeMonthBudgets(budgets, transactions, ym), [budgets, transactions, ym]);
  const warnings = useMemo(() => collectWarnings(summary), [summary]);
  const previousYm = addMonths(ym, -1);
  const previousBudgets = budgetsForMonth(budgets, previousYm);
  const categoryCount = summary.categories.length;
  const isCurrentMonth = compareYM(ym, currentYm) === 0;
  const isPastMonth = compareYM(ym, currentYm) < 0;

  const daysLeft = isCurrentMonth ? daysInMonth(ym.year, ym.month) - Number(today.slice(8, 10)) + 1 : 0;
  const perDay = daysLeft > 0 && summary.remaining > 0 ? summary.remaining / daysLeft : null;

  const copyPrevious = () => {
    const count = actions.copyBudgets(previousYm, ym);
    toast.show({ kind: count > 0 ? 'success' : 'info', message: t.toasts.budgetsCopied(count) });
  };

  const removeBudget = async (budget: Budget) => {
    const label = t.categories[budget.category];
    const ok = await confirm({
      title: t.confirm.deleteBudgetTitle,
      message: t.confirm.deleteBudgetText(label, f.monthYear(ym)),
      confirmLabel: t.common.delete,
    });
    if (!ok) return;
    const removed = actions.deleteBudget(budget.id);
    if (removed) {
      toast.show({
        kind: 'success',
        message: t.toasts.budgetDeleted,
        action: {
          label: t.common.undo,
          onClick: () =>
            actions.saveBudget({ category: removed.category, amount: removed.amount, month: removed.month, year: removed.year }),
        },
      });
    }
  };

  const totalBudget = summary.totalBudget;
  const hasAnyBudget = summary.amount > 0;
  const monthColor = LEVEL_COLORS[summary.level];

  return (
    <div className="space-y-6">
      <PageIntro
        title={t.nav.budget}
        subtitle={t.budget.subtitle}
        actions={
          <Button icon={Plus} onClick={() => setModal({ kind: 'category' })}>
            {t.budget.addBudget}
          </Button>
        }
      />

      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-surface py-2 pl-4 pr-2"
        role="group"
        aria-label={t.budget.monthNav}
      >
        <div className="flex items-center gap-2.5">
          <CalendarRange className="size-5 text-primary-text" aria-hidden="true" strokeWidth={2.2} />
          <p className="text-[17px] font-semibold tracking-[-0.02em] text-ink" aria-live="polite">
            {f.monthYear(ym)}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {!isCurrentMonth && (
            <Button variant="ghost" size="sm" onClick={() => setYm(currentYm)}>
              {t.budget.currentMonth}
            </Button>
          )}
          <IconButton
            icon={ChevronLeft}
            label={t.budget.previousMonth}
            variant="outline"
            tone="primary"
            onClick={() => setYm(addMonths(ym, -1))}
          />
          <IconButton icon={ChevronRight} label={t.budget.nextMonth} variant="outline" tone="primary" onClick={() => setYm(addMonths(ym, 1))} />
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <div>
            <CardHeader
              title={t.budget.monthlyBudget}
              subtitle={f.monthYear(ym)}
              actions={
                <>
                  {hasAnyBudget && <StatusPill level={summary.level} />}
                  {totalBudget ? (
                    <>
                      <IconButton
                        icon={Pencil}
                        size="sm"
                        tone="primary"
                        label={t.budget.editMonthlyBudget}
                        onClick={() => setModal({ kind: 'total', budget: totalBudget })}
                      />
                      <IconButton
                        icon={Trash2}
                        size="sm"
                        tone="danger"
                        label={t.budget.deleteMonthlyBudget}
                        onClick={() => removeBudget(totalBudget)}
                      />
                    </>
                  ) : (
                    <Button variant="soft" size="sm" icon={Plus} onClick={() => setModal({ kind: 'total' })}>
                      {t.budget.setMonthlyBudget}
                    </Button>
                  )}
                </>
              }
            />

            {hasAnyBudget ? (
              <>
                <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
                  <RingProgress
                    percent={summary.percent}
                    color={monthColor}
                    label={t.budget.monthlyBudget}
                    valueText={`${f.percent(summary.percent, 0)} – ${t.budget.ofBudget(f.money(summary.spent), f.money(summary.amount))}`}
                  >
                    <div>
                      <p className="num font-display text-[30px] font-semibold leading-none tracking-[-0.04em] text-ink">
                        {f.percent(summary.percent, 0)}
                      </p>
                      <p className="mt-1.5 text-[12px] font-medium text-muted">{t.budget.spentOf}</p>
                    </div>
                  </RingProgress>
                  <dl className="grid w-full flex-1 grid-cols-1 gap-4 min-[420px]:grid-cols-3 sm:grid-cols-1 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
                    <div className="rounded-[14px] bg-surface-2 px-4 py-3">
                      <dt className="text-[13px] text-muted">{t.budget.monthlyBudget}</dt>
                      <dd className="num mt-1 truncate font-display text-[22px] font-semibold tracking-[-0.03em] text-ink">
                        {f.money(summary.amount)}
                      </dd>
                    </div>
                    <div className="rounded-[14px] bg-surface-2 px-4 py-3">
                      <dt className="text-[13px] text-muted">{t.budget.spent}</dt>
                      <dd className="num mt-1 truncate font-display text-[22px] font-semibold tracking-[-0.03em] text-ink">
                        {f.money(summary.spent)}
                      </dd>
                    </div>
                    <div className="rounded-[14px] bg-surface-2 px-4 py-3">
                      <dt className="text-[13px] text-muted">
                        {summary.remaining >= 0 ? t.budget.remaining : t.budget.exceededBy}
                      </dt>
                      <dd
                        className={`num mt-1 truncate font-display text-[22px] font-semibold tracking-[-0.03em] ${
                          summary.remaining >= 0 ? 'text-income-ink' : 'text-danger-ink'
                        }`}
                      >
                        {f.money(Math.abs(summary.remaining))}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div className="-mx-5 mt-6 space-y-1 px-5 pt-4 text-[13px] text-muted shadow-[inset_0_0.5px_0_var(--separator)] sm:-mx-6 sm:px-6">
                  {perDay !== null && <p className="font-semibold text-ink-2">{t.budget.perDay(f.money(perDay), daysLeft)}</p>}
                  <p>{summary.isDerived ? t.budget.derivedHint : t.budget.explicitHint}</p>
                  {summary.unbudgetedSpent > 0 && <p>{t.budget.unbudgetedShare(f.money(summary.unbudgetedSpent))}</p>}
                </div>
              </>
            ) : (
              <EmptyState
                compact
                icon={Wallet}
                title={t.budget.emptyTitle(f.monthYear(ym))}
                text={t.budget.emptyText}
                action={
                  <>
                    {previousBudgets.length > 0 && (
                      <Button variant="soft" icon={Copy} onClick={copyPrevious}>
                        {t.budget.copyFrom(f.monthName(previousYm))}
                      </Button>
                    )}
                    <Button icon={Plus} onClick={() => setModal({ kind: 'category' })}>
                      {t.budget.addBudget}
                    </Button>
                  </>
                }
              />
            )}
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title={t.budget.warningsTitle} />
          {warnings.length === 0 ? (
            <div className="flex items-center gap-3 py-1">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-income text-white" aria-hidden="true">
                <CircleCheck className="size-5" strokeWidth={2.4} />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-ink">{t.header.noNotificationsTitle}</p>
                <p className="text-[13px] text-muted">{t.header.noNotificationsText}</p>
              </div>
            </div>
          ) : (
            <ul className="inset-rows [--row-inset:44px]">
              {warnings.map((warning) => {
                const severe = warning.level === 'over' || warning.level === 'full';
                const Icon = severe ? CircleAlert : TriangleAlert;
                return (
                  <li key={warning.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${
                        severe ? 'bg-danger text-white' : warning.level === 'warn90' ? 'bg-serious text-white' : 'bg-warn text-black/75'
                      }`}
                      aria-hidden="true"
                    >
                      <Icon className="size-4" strokeWidth={2.4} />
                    </span>
                    <span className="min-w-0 flex-1 text-[14px] leading-snug text-ink">{warningMessage(warning)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <section aria-labelledby="category-budgets-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="category-budgets-title" className="text-[22px] font-bold tracking-[-0.025em] text-ink">
              {t.budget.categoryBudgets}
            </h2>
            <p className="text-[13px] text-muted">{t.budget.categoryBudgetsSub}</p>
          </div>
          {categoryCount === 0 && previousBudgets.some((budget) => budget.category !== 'total') && hasAnyBudget && (
            <Button variant="soft" size="sm" icon={Copy} onClick={copyPrevious}>
              {t.budget.copyFrom(f.monthName(previousYm))}
            </Button>
          )}
        </div>

        {categoryCount === 0 ? (
          <Card>
            <EmptyState
              compact
              icon={Wallet}
              title={t.budget.emptyTitle(f.monthYear(ym))}
              text={t.budget.emptyText}
              action={
                <Button icon={Plus} onClick={() => setModal({ kind: 'category' })}>
                  {t.budget.addBudget}
                </Button>
              }
            />
          </Card>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {summary.categories.map((status) => (
              <BudgetCard
                key={status.budget.id}
                status={status}
                onEdit={() => setModal({ kind: 'category', budget: status.budget })}
                onDelete={() => removeBudget(status.budget)}
              />
            ))}
          </ul>
        )}
      </section>

      {summary.unbudgetedCategories.length > 0 && !isPastMonth && (
        <Card>
          <CardHeader title={t.budget.unbudgetedTitle} subtitle={t.budget.unbudgetedText} />
          <ul className="inset-rows [--row-inset:48px]">
            {summary.unbudgetedCategories.map(({ category, amount }) => {
              const Icon = CATEGORY_ICONS[category];
              return (
                <li key={category} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fill text-ink-2" aria-hidden="true">
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] text-ink">{t.categories[category]}</span>
                  <span className="num text-[14px] font-semibold text-ink-2">{f.money(amount)}</span>
                  <Button variant="ghost" size="sm" icon={Plus} onClick={() => setModal({ kind: 'category', preset: category })}>
                    <span className="hidden sm:inline">{t.budget.setBudget}</span>
                    <span className="sr-only sm:hidden">
                      {t.budget.setBudget}: {t.categories[category]}
                    </span>
                  </Button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <BudgetModal mode={modal} ym={ym} onClose={() => setModal(null)} />
    </div>
  );
}
