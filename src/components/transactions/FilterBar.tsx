import { RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import { useId, useState } from 'react';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, isCategoryOfType, PAYMENT_METHODS } from '../../lib/categories';
import { PERIOD_FILTERS, type PeriodFilter } from '../../lib/dates';
import { countActiveFilters, DEFAULT_FILTERS, SORT_KEYS, type SortKey, type TxFilters } from '../../lib/transactionFilters';
import { useI18n } from '../../state/store';
import type { Category, PaymentMethod } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SegmentedControl } from '../ui/SegmentedControl';

interface FilterBarProps {
  filters: TxFilters;
  onChange: (patch: Partial<TxFilters>) => void;
}

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const { t } = useI18n();
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const active = countActiveFilters(filters);
  const rangeInvalid = filters.period === 'custom' && filters.from && filters.to && filters.from > filters.to;

  const typeOptions = [
    { value: 'all', label: t.transactions.filters.allTypes },
    { value: 'income', label: t.common.income },
    { value: 'expense', label: t.common.expenses },
  ] as const;

  const setType = (type: TxFilters['type']) => {
    const keepCategory = filters.category === 'all' || type === 'all' || isCategoryOfType(filters.category, type);
    onChange({ type, category: keepCategory ? filters.category : 'all' });
  };

  const showIncomeCategories = filters.type !== 'expense';
  const showExpenseCategories = filters.type !== 'income';

  return (
    <Card padded={false} className="p-3 sm:p-4" aria-label={t.transactions.filters.title}>
      <div className="flex flex-col gap-2.5 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={`${id}-search`} className="sr-only">
            {t.transactions.filters.search}
          </label>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-[17px] -translate-y-1/2 text-muted" aria-hidden="true" strokeWidth={2.2} />
          <input
            id={`${id}-search`}
            type="search"
            className="control rounded-[10px] pl-9 pr-10"
            placeholder={t.transactions.filters.searchPlaceholder}
            value={filters.query}
            autoComplete="off"
            onChange={(event) => onChange({ query: event.target.value })}
          />
          {filters.query && (
            <button
              type="button"
              onClick={() => onChange({ query: '' })}
              className="group absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full"
              aria-label={t.transactions.filters.clearSearch}
              title={t.transactions.filters.clearSearch}
            >
              <span className="grid size-[18px] place-items-center rounded-full bg-muted/60 text-surface transition-colors group-hover:bg-muted" aria-hidden="true">
                <X className="size-3" strokeWidth={3} />
              </span>
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={SlidersHorizontal}
            className="flex-1 md:hidden"
            aria-expanded={expanded}
            aria-controls={`${id}-panel`}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? t.transactions.filters.hideFilters : t.transactions.filters.showFilters}
            {active > 0 && (
              <span className="num ml-1 rounded-full bg-primary px-1.5 text-[12px] font-semibold leading-5 text-primary-fg">
                {active}
              </span>
            )}
          </Button>
          <label htmlFor={`${id}-sort`} className="sr-only">
            {t.transactions.filters.sort}
          </label>
          <select
            id={`${id}-sort`}
            className="control flex-1 rounded-[10px] md:w-52 md:flex-none"
            value={filters.sort}
            onChange={(event) => onChange({ sort: event.target.value as SortKey })}
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {t.transactions.sort[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div
        id={`${id}-panel`}
        className={`${expanded ? 'grid' : 'hidden'} mt-4 gap-4 md:grid md:grid-cols-2 xl:grid-cols-[1fr_1.55fr_1fr_1fr]`}
      >
        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-period`} className="px-1 text-[13px] text-muted">
            {t.transactions.filters.period}
          </label>
          <select
            id={`${id}-period`}
            className="control"
            value={filters.period}
            onChange={(event) => onChange({ period: event.target.value as PeriodFilter })}
          >
            {PERIOD_FILTERS.map((period) => (
              <option key={period} value={period}>
                {t.transactions.periods[period]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <span id={`${id}-type-label`} className="px-1 text-[13px] text-muted">
            {t.transactions.filters.type}
          </span>
          <SegmentedControl
            label={t.transactions.filters.type}
            value={filters.type}
            onChange={setType}
            options={typeOptions}
            size="md"
            fullWidth
            className="h-11 items-center"
          />
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-category`} className="px-1 text-[13px] text-muted">
            {t.transactions.filters.category}
          </label>
          <select
            id={`${id}-category`}
            className="control"
            value={filters.category}
            onChange={(event) => onChange({ category: event.target.value as Category | 'all' })}
          >
            <option value="all">{t.transactions.filters.allCategories}</option>
            {showIncomeCategories && (
              <optgroup label={t.common.income}>
                {INCOME_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t.categories[category]}
                  </option>
                ))}
              </optgroup>
            )}
            {showExpenseCategories && (
              <optgroup label={t.common.expenses}>
                {EXPENSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {t.categories[category]}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <label htmlFor={`${id}-payment`} className="px-1 text-[13px] text-muted">
            {t.transactions.filters.paymentMethod}
          </label>
          <select
            id={`${id}-payment`}
            className="control"
            value={filters.paymentMethod}
            onChange={(event) => onChange({ paymentMethod: event.target.value as PaymentMethod | 'all' | 'none' })}
          >
            <option value="all">{t.transactions.filters.allMethods}</option>
            {PAYMENT_METHODS.map((method) => (
              <option key={method} value={method}>
                {t.paymentMethods[method]}
              </option>
            ))}
            <option value="none">{t.common.none}</option>
          </select>
        </div>

        {filters.period === 'custom' && (
          <div className="grid gap-4 sm:grid-cols-2 md:col-span-2">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={`${id}-from`} className="px-1 text-[13px] text-muted">
                {t.transactions.filters.from}
              </label>
              <input
                id={`${id}-from`}
                type="date"
                className="control"
                value={filters.from}
                max={filters.to || undefined}
                aria-invalid={rangeInvalid ? true : undefined}
                aria-describedby={rangeInvalid ? `${id}-range-error` : undefined}
                onChange={(event) => onChange({ from: event.target.value })}
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              <label htmlFor={`${id}-to`} className="px-1 text-[13px] text-muted">
                {t.transactions.filters.to}
              </label>
              <input
                id={`${id}-to`}
                type="date"
                className="control"
                value={filters.to}
                min={filters.from || undefined}
                aria-invalid={rangeInvalid ? true : undefined}
                aria-describedby={rangeInvalid ? `${id}-range-error` : undefined}
                onChange={(event) => onChange({ to: event.target.value })}
              />
            </div>
            {rangeInvalid && (
              <p id={`${id}-range-error`} role="alert" className="text-sm font-medium text-danger-ink sm:col-span-2">
                {t.transactions.filters.rangeInvalid}
              </p>
            )}
          </div>
        )}
      </div>

      {active > 0 && (
        <div className="-mx-3 -mb-3 mt-4 flex flex-wrap items-center justify-between gap-2 px-4 py-2 shadow-[inset_0_0.5px_0_var(--separator)] sm:-mx-4 sm:-mb-4">
          <span className="text-[13px] text-muted">{t.transactions.filters.active(active)}</span>
          <Button
            variant="ghost"
            size="sm"
            icon={RotateCcw}
            onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
          >
            {t.transactions.filters.reset}
          </Button>
        </div>
      )}
    </Card>
  );
}
