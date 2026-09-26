import { Check, Minus, Plus } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';
import { isValidISODate } from '../../lib/dates';
import { amountToInput, parseAmount } from '../../lib/money';
import { GOAL_COLORS, GOAL_NAME_MAX } from '../../lib/storage';
import { useActions, useI18n } from '../../state/store';
import type { GoalColor, SavingsGoal } from '../../types';
import { Button } from '../ui/Button';
import { Field, fieldAria } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useToast } from '../ui/Toast';
import { goalColor } from './GoalBits';

/* ------------------------------------------------------------------ */
/* Sparziel erstellen / bearbeiten                                     */
/* ------------------------------------------------------------------ */

interface GoalModalProps {
  open: boolean;
  goal: SavingsGoal | null;
  onClose: () => void;
}

export function GoalModal({ open, goal, onClose }: GoalModalProps) {
  const { t } = useI18n();
  const formId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? t.goals.editGoal : t.goals.newGoal}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId}>
            {goal ? t.goals.submitUpdate : t.goals.submitCreate}
          </Button>
        </>
      }
    >
      {open && <GoalForm formId={formId} goal={goal} onDone={onClose} />}
    </Modal>
  );
}

function GoalForm({ formId, goal, onDone }: { formId: string; goal: SavingsGoal | null; onDone: () => void }) {
  const { t, f, language } = useI18n();
  const actions = useActions();
  const toast = useToast();
  const id = useId();
  const [name, setName] = useState(goal?.name ?? '');
  const [target, setTarget] = useState(goal ? amountToInput(goal.targetAmount, language) : '');
  const [current, setCurrent] = useState(goal ? amountToInput(goal.currentAmount, language) : '');
  const [deadline, setDeadline] = useState(goal?.deadline ?? '');
  const [color, setColor] = useState<GoalColor>(goal?.color ?? 'blue');
  const [submitted, setSubmitted] = useState(false);

  const amountMessage = (error: 'required' | 'invalid' | 'positive' | 'tooLarge') =>
    ({
      required: t.goals.errors.targetRequired,
      invalid: t.form.errors.amountInvalid,
      positive: t.form.errors.amountPositive,
      tooLarge: t.form.errors.amountTooLarge,
    })[error];

  const parsedTarget = parseAmount(target, language);
  const currentTrimmed = current.trim();
  const parsedCurrent = currentTrimmed === '' || /^0+([.,]0*)?$/.test(currentTrimmed) ? ({ ok: true, value: 0 } as const) : parseAmount(current, language);

  const errors = {
    name: name.trim() ? null : t.goals.errors.nameRequired,
    target: parsedTarget.ok ? null : amountMessage(parsedTarget.error),
    current: parsedCurrent.ok
      ? null
      : parsedCurrent.error === 'positive'
        ? t.goals.errors.currentNegative
        : parsedCurrent.error === 'tooLarge'
          ? t.form.errors.amountTooLarge
          : t.goals.errors.currentInvalid,
    deadline: deadline && !isValidISODate(deadline) ? t.goals.errors.deadlineInvalid : null,
  };
  const shown = submitted ? errors : { name: null, target: null, current: null, deadline: null };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean) || !parsedTarget.ok || !parsedCurrent.ok) {
      window.setTimeout(() => document.getElementById(formId)?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    const wasReached = goal ? goal.currentAmount >= goal.targetAmount : false;
    const saved = actions.saveGoal(
      {
        name: name.trim(),
        targetAmount: parsedTarget.value,
        currentAmount: parsedCurrent.value,
        deadline: deadline || null,
        color,
      },
      goal?.id,
    );
    if (!saved) {
      toast.show({ kind: 'error', message: t.form.errors.summary });
      return;
    }
    toast.show({ kind: 'success', message: goal ? t.toasts.goalUpdated : t.toasts.goalCreated });
    if (!wasReached && saved.currentAmount >= saved.targetAmount) {
      toast.show({ kind: 'success', message: t.toasts.goalReached(saved.name), duration: 6000 });
    }
    onDone();
  };

  return (
    <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-5 pb-3">
      <Field id={`${id}-name`} label={t.goals.name} error={shown.name}>
        <input
          {...fieldAria(`${id}-name`, shown.name)}
          data-autofocus
          type="text"
          className="control"
          maxLength={GOAL_NAME_MAX}
          placeholder={t.goals.namePlaceholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      {!goal && (
        <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label={t.goals.suggestionsLabel}>
          {t.goals.suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setName(suggestion)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                name === suggestion
                  ? 'border-primary bg-primary-soft text-primary-text'
                  : 'border-line text-ink-2 hover:border-line-strong hover:bg-surface-2'
              }`}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={`${id}-target`} label={t.goals.target} error={shown.target}>
          <div className="control flex items-center gap-2">
            <span className="font-semibold text-muted" aria-hidden="true">
              {f.currencySymbol}
            </span>
            <input
              {...fieldAria(`${id}-target`, shown.target)}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={language === 'de' ? '1.500' : '1,500'}
              value={target}
              onChange={(event) => setTarget(event.target.value.slice(0, 20))}
              className="num h-full w-full min-w-0 bg-transparent font-semibold text-ink outline-none placeholder:text-line-strong"
            />
          </div>
        </Field>
        <Field id={`${id}-current`} label={t.goals.current} optional error={shown.current}>
          <div className="control flex items-center gap-2">
            <span className="font-semibold text-muted" aria-hidden="true">
              {f.currencySymbol}
            </span>
            <input
              {...fieldAria(`${id}-current`, shown.current)}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={current}
              onChange={(event) => setCurrent(event.target.value.slice(0, 20))}
              className="num h-full w-full min-w-0 bg-transparent font-semibold text-ink outline-none placeholder:text-line-strong"
            />
          </div>
        </Field>
      </div>

      <Field id={`${id}-deadline`} label={t.goals.deadline} optional error={shown.deadline}>
        <input
          {...fieldAria(`${id}-deadline`, shown.deadline)}
          type="date"
          className="control"
          min="1900-01-01"
          max="2200-12-31"
          value={deadline}
          onChange={(event) => setDeadline(event.target.value)}
        />
      </Field>

      <div>
        <p id={`${id}-color`} className="mb-2 text-sm font-semibold text-ink-2">
          {t.goals.color}
        </p>
        <div role="radiogroup" aria-labelledby={`${id}-color`} className="flex flex-wrap gap-2.5">
          {GOAL_COLORS.map((option) => {
            const selected = option === color;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t.goals.colors[option]}
                title={t.goals.colors[option]}
                onClick={() => setColor(option)}
                className={`grid size-10 place-items-center rounded-full ring-offset-2 ring-offset-[var(--surface)] transition-transform hover:scale-105 ${
                  selected ? 'ring-2 ring-[var(--ink)]' : ''
                }`}
                style={{ background: goalColor(option) }}
              >
                {selected && <Check className="size-5 text-white" aria-hidden="true" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>
      <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Einzahlen / Entnehmen                                               */
/* ------------------------------------------------------------------ */

interface AdjustModalProps {
  goal: SavingsGoal | null;
  onClose: () => void;
}

export function AdjustGoalModal({ goal, onClose }: AdjustModalProps) {
  const { t, f } = useI18n();
  const formId = useId();
  const [mode, setMode] = useState<'deposit' | 'withdraw'>('deposit');
  return (
    <Modal
      open={goal !== null}
      onClose={() => {
        setMode('deposit');
        onClose();
      }}
      size="sm"
      title={goal ? t.goals.adjustTitle(goal.name) : ''}
      description={goal ? t.goals.adjustDescription(f.money(goal.currentAmount), f.money(goal.targetAmount)) : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={formId} icon={mode === 'deposit' ? Plus : Minus}>
            {mode === 'deposit' ? t.goals.depositSubmit : t.goals.withdrawSubmit}
          </Button>
        </>
      }
    >
      {goal && (
        <AdjustForm
          formId={formId}
          goal={goal}
          mode={mode}
          onModeChange={setMode}
          onDone={() => {
            setMode('deposit');
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

function AdjustForm({
  formId,
  goal,
  mode,
  onModeChange,
  onDone,
}: {
  formId: string;
  goal: SavingsGoal;
  mode: 'deposit' | 'withdraw';
  onModeChange: (mode: 'deposit' | 'withdraw') => void;
  onDone: () => void;
}) {
  const { t, f, language } = useI18n();
  const actions = useActions();
  const toast = useToast();
  const id = useId();
  const [amount, setAmount] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const parsed = parseAmount(amount, language);
  let error: string | null = parsed.ok
    ? null
    : {
        required: t.form.errors.amountRequired,
        invalid: t.form.errors.amountInvalid,
        positive: t.form.errors.amountPositive,
        tooLarge: t.form.errors.amountTooLarge,
      }[parsed.error];
  if (!error && parsed.ok && mode === 'withdraw' && parsed.value > goal.currentAmount) error = t.goals.errors.withdrawTooMuch;
  const shownError = submitted ? error : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (error || !parsed.ok) {
      window.setTimeout(() => document.getElementById(`${id}-amount`)?.focus(), 0);
      return;
    }
    const wasReached = goal.currentAmount >= goal.targetAmount;
    const saved = actions.adjustGoal(goal.id, mode === 'deposit' ? parsed.value : -parsed.value);
    if (!saved) {
      toast.show({ kind: 'error', message: t.form.errors.summary });
      return;
    }
    toast.show({
      kind: 'success',
      message: mode === 'deposit' ? t.toasts.goalDeposit(f.money(parsed.value), goal.name) : t.toasts.goalWithdraw(f.money(parsed.value), goal.name),
    });
    if (!wasReached && saved.currentAmount >= saved.targetAmount) {
      toast.show({ kind: 'success', message: t.toasts.goalReached(saved.name), duration: 6000 });
    }
    onDone();
  };

  return (
    <form id={formId} noValidate onSubmit={onSubmit} className="flex flex-col gap-5 pb-3">
      <SegmentedControl
        label={t.goals.adjustMode}
        value={mode}
        onChange={onModeChange}
        fullWidth
        size="md"
        options={[
          { value: 'deposit', label: t.goals.deposit, icon: Plus },
          { value: 'withdraw', label: t.goals.withdraw, icon: Minus },
        ]}
      />
      <Field id={`${id}-amount`} label={t.goals.adjustAmount} error={shownError}>
        <div className="control flex h-14 items-center gap-2 px-4">
          <span className="text-lg font-semibold text-muted" aria-hidden="true">
            {f.currencySymbol}
          </span>
          <input
            {...fieldAria(`${id}-amount`, shownError)}
            data-autofocus
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={t.form.amountPlaceholder}
            value={amount}
            onChange={(event) => setAmount(event.target.value.slice(0, 20))}
            className="num h-full w-full min-w-0 bg-transparent font-display text-xl font-semibold text-ink outline-none placeholder:text-line-strong"
          />
        </div>
      </Field>
      <button type="submit" className="hidden" tabIndex={-1} aria-hidden="true" />
    </form>
  );
}
