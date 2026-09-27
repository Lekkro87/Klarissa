import { CircleAlert, CircleCheck, Pencil, Trash2, TriangleAlert } from 'lucide-react';
import type { BudgetLevel, BudgetStatus } from '../../lib/calculations';
import { CATEGORY_ICONS } from '../../lib/categories';
import { useI18n } from '../../state/store';
import { IconButton } from '../ui/Button';
import { LEVEL_COLORS, ProgressBar } from '../ui/ProgressBar';
import { useWarningMessage } from './warningText';

const STATUS_STYLES: Record<BudgetLevel, string> = {
  ok: 'bg-income-soft text-income-ink',
  warn75: 'bg-warn-soft text-warn-ink',
  warn90: 'bg-serious-soft text-serious-ink',
  full: 'bg-danger-soft text-danger-ink',
  over: 'bg-danger-soft text-danger-ink',
};

export function StatusPill({ level }: { level: BudgetLevel }) {
  const { t } = useI18n();
  const Icon = level === 'ok' ? CircleCheck : level === 'warn75' || level === 'warn90' ? TriangleAlert : CircleAlert;
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-semibold ${STATUS_STYLES[level]}`}>
      <Icon className="size-3.5" aria-hidden="true" strokeWidth={2.4} />
      {t.budget.status[level]}
    </span>
  );
}

/** Kompakte Zeile für die Budgetübersicht im Dashboard. */
export function BudgetRow({ status }: { status: BudgetStatus }) {
  const { t, f } = useI18n();
  const Icon = CATEGORY_ICONS[status.category];
  const label = t.categories[status.category];
  return (
    <li className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fill text-ink-2" aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink">{label}</span>
        <span
          className={`num text-[14px] font-semibold ${
            status.level === 'ok' ? 'text-ink' : status.level === 'warn75' ? 'text-warn-ink' : status.level === 'warn90' ? 'text-serious-ink' : 'text-danger-ink'
          }`}
        >
          {f.percent(status.percent, 0)}
        </span>
      </div>
      <ProgressBar
        percent={status.percent}
        label={t.budget.progressLabel(label)}
        valueText={t.budget.ofBudget(f.money(status.spent), f.money(status.budget.amount))}
        color={LEVEL_COLORS[status.level]}
      />
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[13px]">
        <span className="num text-muted">{t.budget.ofBudget(f.money(status.spent), f.money(status.budget.amount))}</span>
        {status.level !== 'ok' && <StatusPill level={status.level} />}
      </div>
    </li>
  );
}

interface BudgetCardProps {
  status: BudgetStatus;
  onEdit: () => void;
  onDelete: () => void;
}

/** Ausführliche Budgetkarte für die Budget-Seite. */
export function BudgetCard({ status, onEdit, onDelete }: BudgetCardProps) {
  const { t, f } = useI18n();
  const message = useWarningMessage();
  const Icon = CATEGORY_ICONS[status.category];
  const label = t.categories[status.category];
  const exceeded = status.remaining < 0;

  return (
    <li className="card flex min-w-0 flex-col gap-4 p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-fill text-ink-2" aria-hidden="true">
          <Icon className="size-[19px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[17px] font-semibold tracking-[-0.02em] text-ink">{label}</h3>
          <p className="num text-[13px] text-muted">{f.money(status.budget.amount)}</p>
        </div>
        <div className="-mr-2 -mt-1 flex">
          <IconButton icon={Pencil} size="sm" tone="primary" label={`${t.budget.editBudget}: ${label}`} onClick={onEdit} />
          <IconButton icon={Trash2} size="sm" tone="danger" label={`${t.common.delete}: ${label}`} onClick={onDelete} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-end justify-between gap-2">
          <p className="num font-display text-[22px] font-semibold tracking-[-0.03em] text-ink">
            {f.money(status.spent)}
            <span className="ml-1 font-sans text-[13px] font-normal tracking-normal text-muted">{t.budget.spentOf}</span>
          </p>
          <StatusPill level={status.level} />
        </div>
        <ProgressBar
          percent={status.percent}
          label={t.budget.progressLabel(label)}
          valueText={`${f.percent(status.percent, 0)} – ${t.budget.ofBudget(f.money(status.spent), f.money(status.budget.amount))}`}
          color={LEVEL_COLORS[status.level]}
          size="lg"
        />
        <div className="num flex items-center justify-between text-[13px]">
          <span className="font-semibold text-ink-2">{f.percent(status.percent, 0)}</span>
          <span className={exceeded ? 'font-semibold text-danger-ink' : 'text-muted'}>
            {exceeded ? `${t.budget.exceededBy} ${f.money(status.over)}` : `${f.money(status.remaining)} ${t.budget.left}`}
          </span>
        </div>
      </div>

      {status.level !== 'ok' && (
        <p
          className={`rounded-[12px] px-3 py-2 text-[13px] ${
            status.level === 'warn75' ? 'bg-warn-soft text-warn-ink' : status.level === 'warn90' ? 'bg-serious-soft text-serious-ink' : 'bg-danger-soft text-danger-ink'
          }`}
        >
          {message({ ...status, category: status.category })}
        </p>
      )}
    </li>
  );
}
