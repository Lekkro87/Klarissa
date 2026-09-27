import { type FormEvent, useId, useState } from 'react';
import { EXPENSE_CATEGORIES } from '../../lib/categories';
import type { YearMonth } from '../../lib/dates';
import { amountToInput, parseAmount } from '../../lib/money';
import { useActions, useData, useI18n } from '../../state/store';
import type { Budget, ExpenseCategory } from '../../types';
import { Field, fieldAria } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

export type BudgetModalMode =
  | { kind: 'category'; budget?: Budget; preset?: ExpenseCategory }
  | { kind: 'total'; budget?: Budget };

interface BudgetModalProps {
  mode: BudgetModalMode | null;
  ym: YearMonth;
  onClose: () => void;
}

export function BudgetModal({ mode, ym, onClose }: BudgetModalProps) {
  const { t, f } = useI18n();
  const formId = useId();
  const title =
    mode?.kind === 'total'
      ? mode.budget
        ? t.budget.editMonthlyBudget
        : t.budget.newMonthlyBudget
      : mode?.budget
        ? t.budget.editBudget
        : t.budget.newBudget;
  return (
    <Modal
      open={mode !== null}
      onClose={onClose}
      size="sm"
      title={title}
      description={t.budget.validFor(f.monthYear(ym))}
      confirm={{ label: t.form.saveShort, form: formId }}
    >
      {mode && <BudgetForm formId={formId} mode={mode} ym={ym} onDone={onClose} />}
    </Modal>
  );
}

function BudgetForm({ formId, mode, ym, onDone }: { formId: string; mode: BudgetModalMode; ym: YearMonth; onDone: () => void }) {
  const { t, f, language } = useI18n();
  const { budgets } = useData();
  const actions = useActions();
  const toast = useToast();
  const id = useId();
  const monthBudgets = budgets.filter((budget) => budget.month === ym.month && budget.year === ym.year);
  const taken = new Set(monthBudgets.filter((budget) => budget.id !== mode.budget?.id).map((budget) => budget.category));

  const initialCategory: ExpenseCategory | '' =
    mode.kind === 'category'
      ? ((mode.budget?.category as ExpenseCategory | undefined) ??
        mode.preset ??
        EXPENSE_CATEGORIES.find((category) => !taken.has(category)) ??
        '')
      : '';
  const [category, setCategory] = useState<ExpenseCategory | ''>(initialCategory);
  const [amount, setAmount] = useState(mode.budget ? amountToInput(mode.budget.amount, language) : '');
  const [submitted, setSubmitted] = useState(false);

  const parsed = parseAmount(amount, language);
  const amountError = parsed.ok
    ? null
    : {
        required: t.form.errors.amountRequired,
        invalid: t.form.errors.amountInvalid,
        positive: t.form.errors.amountPositive,
        tooLarge: t.form.errors.amountTooLarge,
      }[parsed.error];
  const categoryError = mode.kind === 'category' && !category ? t.form.errors.categoryRequired : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!parsed.ok || categoryError) {
      window.setTimeout(() => document.getElementById(formId)?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    const saved = actions.saveBudget(
      {
        category: mode.kind === 'total' ? 'total' : (category as ExpenseCategory),
        amount: parsed.value,
        month: ym.month,
        year: ym.year,
      },
      mode.budget?.id,
    );
    if (!saved) {
      toast.show({ kind: 'error', message: t.form.errors.summary });
      return;
    }
    toast.show({ kind: 'success', message: t.toasts.budgetSaved });
    onDone();
  };

  return (
    <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-5 pb-3">
      {mode.kind === 'category' && (
        <Field
          id={`${id}-category`}
          label={t.form.category}
          error={submitted ? categoryError : null}
          hint={category && taken.has(category) ? t.budget.existsHint : undefined}
        >
          <select
            {...fieldAria(`${id}-category`, submitted ? categoryError : null, Boolean(category && taken.has(category)))}
            className="control"
            value={category}
            onChange={(event) => setCategory(event.target.value as ExpenseCategory)}
          >
            <option value="" disabled>
              {t.form.selectCategory}
            </option>
            {EXPENSE_CATEGORIES.map((key) => (
              <option key={key} value={key}>
                {t.categories[key]}
                {taken.has(key) ? ` (${t.budget.alreadyBudgeted})` : ''}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field id={`${id}-amount`} label={t.budget.budgetAmount} error={submitted ? amountError : null}>
        <div className="control flex h-16 items-center gap-2 px-4">
          <span className="text-[22px] font-semibold text-muted" aria-hidden="true">
            {f.currencySymbol}
          </span>
          <input
            {...fieldAria(`${id}-amount`, submitted ? amountError : null)}
            data-autofocus
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={t.form.amountPlaceholder}
            value={amount}
            onChange={(event) => setAmount(event.target.value.slice(0, 20))}
            className="num h-full w-full min-w-0 bg-transparent font-display text-[28px] font-semibold tracking-[-0.02em] text-ink outline-none placeholder:text-muted/40"
          />
        </div>
      </Field>
      {mode.kind === 'total' && <p className="pl-1 text-[13px] text-muted">{t.budget.explicitHint}</p>}
      <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
    </form>
  );
}
