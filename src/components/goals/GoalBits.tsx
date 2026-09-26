import { CalendarClock, Flag, HandCoins, Pencil, PiggyBank, Trash2, Trophy } from 'lucide-react';
import { goalProgress, monthlyNeeded } from '../../lib/calculations';
import { useI18n, useToday } from '../../state/store';
import type { GoalColor, SavingsGoal } from '../../types';
import { Button, IconButton } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';

export const goalColor = (color: GoalColor) => `var(--goal-${color})`;

/** Kompakte Darstellung für das Dashboard. */
export function GoalRow({ goal }: { goal: SavingsGoal }) {
  const { t, f } = useI18n();
  const progress = goalProgress(goal);
  const reached = progress >= 100;
  const color = goalColor(goal.color);
  return (
    <li className="space-y-2">
      <div className="flex items-center gap-3">
        <span
          className="grid size-8 shrink-0 place-items-center rounded-lg"
          style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          aria-hidden="true"
        >
          {reached ? <Trophy className="size-4" /> : <PiggyBank className="size-4" />}
        </span>
        <span className="min-w-0 flex-1 truncate font-semibold text-ink">{goal.name}</span>
        <span className="num text-sm font-bold text-ink">{f.percent(Math.min(progress, 999), 0)}</span>
      </div>
      <ProgressBar
        percent={progress}
        color={color}
        label={t.goals.progressLabel(goal.name)}
        valueText={`${f.money(goal.currentAmount)} / ${f.money(goal.targetAmount)}`}
      />
      <p className="num text-[13px] text-muted">
        {f.money(goal.currentAmount)} / {f.money(goal.targetAmount)}
      </p>
    </li>
  );
}

interface GoalCardProps {
  goal: SavingsGoal;
  onEdit: () => void;
  onDelete: () => void;
  onAdjust: () => void;
}

export function GoalCard({ goal, onEdit, onDelete, onAdjust }: GoalCardProps) {
  const { t, f } = useI18n();
  const today = useToday();
  const progress = goalProgress(goal);
  const reached = progress >= 100;
  const color = goalColor(goal.color);
  const perMonth = monthlyNeeded(goal, today);
  const overdue = !reached && goal.deadline !== null && goal.deadline < today;

  return (
    <li className="card relative flex min-w-0 flex-col gap-5 overflow-hidden p-5 transition-shadow duration-200 hover:shadow-hover">
      <div className="flex items-start gap-3">
        <span
          className="grid size-11 shrink-0 place-items-center rounded-2xl"
          style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}
          aria-hidden="true"
        >
          {reached ? <Trophy className="size-5" /> : <PiggyBank className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-[17px] font-semibold text-ink">{goal.name}</h3>
          <p className="flex items-center gap-1.5 text-[13px] text-muted">
            {goal.deadline ? (
              <>
                <CalendarClock className="size-3.5" aria-hidden="true" />
                <span className={overdue ? 'font-semibold text-danger-ink' : ''}>
                  {overdue ? t.goals.deadlinePassed : t.goals.dueOn(f.date(goal.deadline))}
                </span>
              </>
            ) : (
              <>
                <Flag className="size-3.5" aria-hidden="true" />
                {t.goals.noDeadline}
              </>
            )}
          </p>
        </div>
        <div className="-mr-2 -mt-1 flex">
          <IconButton icon={Pencil} size="sm" tone="primary" label={t.goals.editLabel(goal.name)} onClick={onEdit} />
          <IconButton icon={Trash2} size="sm" tone="danger" label={t.goals.deleteLabel(goal.name)} onClick={onDelete} />
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted">{t.goals.saved}</p>
            <p className="num truncate font-display text-2xl font-semibold tracking-[-0.03em] text-ink">
              {f.money(goal.currentAmount)}
            </p>
          </div>
          <p className="num shrink-0 pb-1 text-sm text-muted">
            {t.common.of} {f.money(goal.targetAmount)}
          </p>
        </div>
        <ProgressBar
          percent={progress}
          color={color}
          size="lg"
          label={t.goals.progressLabel(goal.name)}
          valueText={`${f.percent(progress, 0)} – ${f.money(goal.currentAmount)} / ${f.money(goal.targetAmount)}`}
        />
        <div className="num flex items-center justify-between gap-2 text-[13px]">
          <span className="font-semibold text-ink-2">{f.percent(Math.min(progress, 999), 0)}</span>
          {reached ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-income-soft px-2 py-0.5 text-xs font-semibold text-income-ink">
              <Trophy className="size-3.5" aria-hidden="true" />
              {t.goals.reached}
            </span>
          ) : (
            <span className="text-muted">{t.goals.remaining(f.money(goal.targetAmount - goal.currentAmount))}</span>
          )}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <p className="min-w-0 flex-1 text-[13px] text-muted">
          {perMonth !== null ? t.goals.perMonth(f.money(perMonth)) : ''}
        </p>
        <Button variant="soft" size="sm" icon={HandCoins} onClick={onAdjust} aria-label={t.goals.depositLabel(goal.name)}>
          {t.goals.deposit}
        </Button>
      </div>
    </li>
  );
}
