import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { type FormEvent, type KeyboardEvent, useId, useRef, useState } from 'react';
import { LEVEL_RANK, summarizeMonthBudgets, collectWarnings } from '../../lib/calculations';
import { categoriesFor, isCategoryOfType, PAYMENT_METHODS } from '../../lib/categories';
import { isValidISODate, ymOf } from '../../lib/dates';
import { amountToInput, parseAmount } from '../../lib/money';
import { DESCRIPTION_MAX } from '../../lib/storage';
import { useActions, useData, useI18n, useToday } from '../../state/store';
import type { Category, PaymentMethod, Transaction, TransactionType } from '../../types';
import { useWarningMessage } from '../budget/warningText';
import { Button } from '../ui/Button';
import { Field, fieldAria } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

interface TransactionModalProps {
  open: boolean;
  transaction: Transaction | null;
  defaultType?: TransactionType;
  onClose: () => void;
}

export function TransactionModal({ open, transaction, defaultType = 'expense', onClose }: TransactionModalProps) {
  const { t } = useI18n();
  const formId = useId();
  const editing = transaction !== null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? t.form.editTitle : t.form.addTitle}
      description={editing ? t.form.editDescription : t.form.addDescription}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId}>
            {t.form.submit}
          </Button>
        </>
      }
    >
      {open && <TransactionForm formId={formId} transaction={transaction} defaultType={defaultType} onDone={onClose} />}
    </Modal>
  );
}

type Errors = Partial<Record<'amount' | 'category' | 'date' | 'description', string>>;

interface FormProps {
  formId: string;
  transaction: Transaction | null;
  defaultType: TransactionType;
  onDone: () => void;
}

function TransactionForm({ formId, transaction, defaultType, onDone }: FormProps) {
  const { t, f, language } = useI18n();
  const data = useData();
  const actions = useActions();
  const toast = useToast();
  const today = useToday();
  const warningMessage = useWarningMessage();
  const baseId = useId();
  const typeRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const [type, setType] = useState<TransactionType>(transaction?.type ?? defaultType);
  const [amount, setAmount] = useState(transaction ? amountToInput(transaction.amount, language) : '');
  const [category, setCategory] = useState<Category | ''>(transaction?.category ?? '');
  const [description, setDescription] = useState(transaction?.description ?? '');
  const [date, setDate] = useState(transaction?.date ?? today);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>(
    transaction ? (transaction.paymentMethod ?? '') : 'checking',
  );
  const [submitted, setSubmitted] = useState(false);

  const validate = (): { errors: Errors; value: number | null } => {
    const errors: Errors = {};
    const parsed = parseAmount(amount, language);
    if (!parsed.ok) {
      errors.amount = {
        required: t.form.errors.amountRequired,
        invalid: t.form.errors.amountInvalid,
        positive: t.form.errors.amountPositive,
        tooLarge: t.form.errors.amountTooLarge,
      }[parsed.error];
    }
    if (!category || !isCategoryOfType(category, type)) errors.category = t.form.errors.categoryRequired;
    if (!date) errors.date = t.form.errors.dateRequired;
    else if (!isValidISODate(date)) errors.date = t.form.errors.dateInvalid;
    if (description.trim().length > DESCRIPTION_MAX) errors.description = t.form.errors.descriptionTooLong(DESCRIPTION_MAX);
    return { errors, value: parsed.ok ? parsed.value : null };
  };

  const { errors } = validate();
  const visibleErrors: Errors = submitted ? errors : {};

  const changeType = (next: TransactionType) => {
    setType(next);
    if (category && !isCategoryOfType(category, next)) setCategory('');
  };

  const onTypeKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const next: TransactionType = type === 'income' ? 'expense' : 'income';
    changeType(next);
    typeRefs.current[next === 'income' ? 0 : 1]?.focus();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    const result = validate();
    if (Object.keys(result.errors).length > 0 || result.value === null || !category) {
      // Nach dem Rendern der Fehlermeldungen das erste ungültige Feld fokussieren
      window.setTimeout(() => {
        document.getElementById(formId)?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      }, 0);
      return;
    }

    const input = {
      type,
      amount: result.value,
      category,
      description: description.trim(),
      date,
      paymentMethod: paymentMethod || null,
    };

    const before = type === 'expense' ? summarizeMonthBudgets(data.budgets, data.transactions, ymOf(date)) : null;
    const saved = transaction ? actions.updateTransaction(transaction.id, input) : actions.addTransaction(input);
    if (!saved) {
      toast.show({ kind: 'error', message: t.form.errors.summary });
      return;
    }
    toast.show({ kind: 'success', message: transaction ? t.toasts.txUpdated : t.toasts.txAdded });

    // Dezenter Hinweis, wenn durch diese Ausgabe eine neue Budgetstufe erreicht wird
    if (before) {
      const nextTransactions = transaction
        ? data.transactions.map((tx) => (tx.id === saved.id ? saved : tx))
        : [saved, ...data.transactions];
      const after = collectWarnings(summarizeMonthBudgets(data.budgets, nextTransactions, ymOf(date)));
      const previous = new Map(collectWarnings(before).map((warning) => [warning.budgetId, warning.level]));
      const escalated = after.find(
        (warning) =>
          (warning.category === saved.category || warning.category === 'total') &&
          LEVEL_RANK[warning.level] > LEVEL_RANK[previous.get(warning.budgetId) ?? 'ok'],
      );
      if (escalated) {
        toast.show({ kind: 'warning', title: t.toasts.budgetWarning, message: warningMessage(escalated), duration: 7000 });
      }
    }
    onDone();
  };

  const ids = {
    amount: `${baseId}-amount`,
    category: `${baseId}-category`,
    description: `${baseId}-description`,
    date: `${baseId}-date`,
    payment: `${baseId}-payment`,
  };
  const typeOptions: { value: TransactionType; label: string; icon: typeof ArrowDownLeft }[] = [
    { value: 'income', label: t.common.incomeSingular, icon: ArrowDownLeft },
    { value: 'expense', label: t.common.expenseSingular, icon: ArrowUpRight },
  ];
  const remaining = DESCRIPTION_MAX - description.length;

  return (
    <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-5 pb-3">
      <div>
        <p id={`${baseId}-type-label`} className="mb-1.5 text-sm font-semibold text-ink-2">
          {t.form.type}
        </p>
        <div role="radiogroup" aria-labelledby={`${baseId}-type-label`} className="grid grid-cols-2 gap-2.5">
          {typeOptions.map((option, index) => {
            const selected = option.value === type;
            const Icon = option.icon;
            const tone =
              option.value === 'income'
                ? 'border-income bg-income-soft text-income-ink'
                : 'border-expense bg-expense-soft text-expense-ink';
            return (
              <button
                key={option.value}
                ref={(element) => {
                  typeRefs.current[index] = element;
                }}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                onClick={() => changeType(option.value)}
                onKeyDown={onTypeKeyDown}
                className={`flex h-14 items-center justify-center gap-2 rounded-2xl border-2 text-[15px] font-semibold transition-all duration-150 ${
                  selected ? tone : 'border-line bg-surface text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full ${
                    selected ? 'bg-surface/70' : 'bg-surface-3'
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" strokeWidth={2.5} />
                </span>
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <Field id={ids.amount} label={t.form.amount} error={visibleErrors.amount}>
        <div className="control flex h-14 items-center gap-2 px-4">
          <span className="text-lg font-semibold text-muted" aria-hidden="true">
            {f.currencySymbol}
          </span>
          <input
            {...fieldAria(ids.amount, visibleErrors.amount)}
            data-autofocus
            type="text"
            inputMode="decimal"
            autoComplete="off"
            enterKeyHint="next"
            placeholder={t.form.amountPlaceholder}
            value={amount}
            onChange={(event) => setAmount(event.target.value.slice(0, 20))}
            className="num h-full w-full min-w-0 bg-transparent font-display text-xl font-semibold text-ink outline-none placeholder:text-line-strong"
          />
        </div>
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={ids.category} label={t.form.category} error={visibleErrors.category}>
          <select
            {...fieldAria(ids.category, visibleErrors.category)}
            className="control"
            value={category}
            onChange={(event) => setCategory(event.target.value as Category)}
          >
            <option value="" disabled>
              {t.form.selectCategory}
            </option>
            {categoriesFor(type).map((key) => (
              <option key={key} value={key}>
                {t.categories[key]}
              </option>
            ))}
          </select>
        </Field>
        <Field id={ids.date} label={t.form.date} error={visibleErrors.date}>
          <input
            {...fieldAria(ids.date, visibleErrors.date)}
            type="date"
            className="control"
            min="1900-01-01"
            max="2200-12-31"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
      </div>

      <Field
        id={ids.description}
        label={t.form.description}
        optional
        error={visibleErrors.description}
        hint={remaining <= 20 ? t.form.charactersLeft(Math.max(0, remaining)) : undefined}
      >
        <input
          {...fieldAria(ids.description, visibleErrors.description, remaining <= 20)}
          type="text"
          className="control"
          maxLength={DESCRIPTION_MAX}
          placeholder={t.form.descriptionPlaceholder}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      <Field id={ids.payment} label={t.form.paymentMethod} optional>
        <select
          id={ids.payment}
          className="control"
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod | '')}
        >
          <option value="">{t.common.none}</option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method} value={method}>
              {t.paymentMethods[method]}
            </option>
          ))}
        </select>
      </Field>

      {submitted && Object.keys(errors).length > 0 && (
        <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger-ink">
          {t.form.errors.summary}
        </p>
      )}
      {/* Verstecktes Submit-Feld, damit Enter in Eingabefeldern das Formular absendet */}
      <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
    </form>
  );
}
