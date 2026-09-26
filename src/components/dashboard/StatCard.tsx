import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sparkline } from '../charts/Sparkline';

type Tone = 'primary' | 'income' | 'expense' | 'neutral';

const TONES: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-text',
  income: 'bg-income-soft text-income-ink',
  expense: 'bg-expense-soft text-expense-ink',
  neutral: 'bg-surface-3 text-ink-2',
};

export interface Trend {
  values: number[];
  labels: string[];
  color: string;
  format: (value: number) => string;
  label: string;
}

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Veränderungsindikator (z. B. <Delta />) */
  delta?: ReactNode;
  /** Vergleichstext, z. B. „gegenüber dem letzten Monat“ */
  caption?: ReactNode;
  /** Optionale Verlaufskurve */
  trend?: Trend;
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', delta, caption, trend }: StatCardProps) {
  return (
    <section className="card @container group min-w-0 p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-hover">
      <div className="flex h-full flex-col gap-4 @[25rem]:flex-row @[25rem]:items-center @[25rem]:gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span className={`grid size-8 shrink-0 place-items-center rounded-[10px] ${TONES[tone]}`} aria-hidden="true">
              <Icon className="size-[17px]" strokeWidth={2.1} />
            </span>
            <h2 className="truncate text-sm font-semibold text-muted">{label}</h2>
          </div>
          <p className="mt-3 truncate font-display text-[27px] font-semibold leading-none tracking-[-0.04em] text-ink">
            {value}
          </p>
          {(delta || caption) && (
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
              {delta}
              {caption && <span>{caption}</span>}
            </div>
          )}
        </div>
        {trend && (
          <div className="w-full @[25rem]:w-[42%] @[25rem]:max-w-[240px]">
            <Sparkline
              values={trend.values}
              labels={trend.labels}
              color={trend.color}
              format={trend.format}
              label={trend.label}
              height={52}
            />
          </div>
        )}
      </div>
    </section>
  );
}
