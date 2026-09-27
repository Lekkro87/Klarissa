import { CalendarClock, Flag, HandCoins, Pencil, PiggyBank, Trash2, Trophy } from 'lucide-react';
import { goalProgress, monthlyNeeded } from '../../lib/calculations';
import { useI18n, useToday } from '../../state/store';
import type { GoalColor, SavingsGoal } from '../../types';
import { Button, IconButton } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { RingProgress } from '../ui/RingProgress';

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
        <span className="grid size-8 shrink-0 place-items-center rounded-full text-white" style={{ background: color }} aria-hidden="true">
          {reached ? <Trophy className="size-4" strokeWidth={2.2} /> : <PiggyBank className="size-4" strokeWidth={2.2} />}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{goal.name}</span>
        <span className="num text-[14px] font-semibold text-ink">{f.percent(Math.min(progress, 999), 0)}</span>
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
    <li className="card flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full text-white" style={{ background: color }} aria-hidden="true">
          {reached ? <Trophy className="size-[18px]" strokeWidth={2.2} /> : <PiggyBank className="size-[18px]" strokeWidth={2.2} />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-ink">{goal.name}</h3>
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
        <div className="-mr-2 flex">
          <IconButton icon={Pencil} size="sm" tone="primary" label={t.goals.editLabel(goal.name)} onClick={onEdit} />
          <IconButton icon={Trash2} size="sm" tone="danger" label={t.goals.deleteLabel(goal.name)} onClick={onDelete} />
        </div>
      </div>

      <div className="flex items-center gap-5">
        <RingProgress
          percent={progress}
          color={color}
          size={96}
          thickness={12}
          label={t.goals.progressLabel(goal.name)}
          valueText={`${f.percent(progress, 0)} – ${f.money(goal.currentAmount)} / ${f.money(goal.targetAmount)}`}
        >
          <span className="num text-[17px] font-semibold tracking-[-0.02em] text-ink">{f.percent(Math.min(progress, 999), 0)}</span>
        </RingProgress>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted">{t.goals.saved}</p>
          <p className="num truncate font-display text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink">
            {f.money(goal.currentAmount)}
          </p>
          <p className="num text-[13px] text-muted">
            {t.common.of} {f.money(goal.targetAmount)}
          </p>
          {reached ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-income-soft px-2 py-0.5 text-[12px] font-semibold text-income-ink">
              <Trophy className="size-3.5" aria-hidden="true" />
              {t.goals.reached}
            </span>
          ) : (
            <p className="num mt-1 text-[13px] font-medium text-ink-2">{t.goals.remaining(f.money(goal.targetAmount - goal.currentAmount))}</p>
          )}
        </div>
      </div>

      <div className="-mx-4 -mb-4 mt-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 shadow-[inset_0_0.5px_0_var(--separator)] sm:-mx-5 sm:-mb-5 sm:px-5">
        <p className="min-w-0 flex-1 text-[13px] text-muted">{perMonth !== null ? t.goals.perMonth(f.money(perMonth)) : ''}</p>
        <Button variant="secondary" size="sm" icon={HandCoins} onClick={onAdjust} aria-label={t.goals.depositLabel(goal.name)}>
          {t.goals.deposit}
        </Button>
      </div>
    </li>
  );
}
