import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Sparkline } from '../charts/Sparkline';

type Tone = 'primary' | 'income' | 'expense' | 'neutral';

/* Überschrift in der Farbe der Kategorie – wie die Karten der Health-App */
const TONES: Record<Tone, string> = {
  primary: 'text-primary-text',
  income: 'text-income-ink',
  expense: 'text-expense-ink',
  neutral: 'text-muted',
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
    <section className="card @container min-w-0 p-4 sm:p-5">
      <h2 className={`flex items-center gap-1.5 text-[15px] font-semibold tracking-[-0.01em] ${TONES[tone]}`}>
        <Icon className="size-[17px] shrink-0" aria-hidden="true" strokeWidth={2.4} />
        <span className="truncate">{label}</span>
      </h2>
      <div className="mt-3 flex flex-col gap-3 @[22rem]:flex-row @[22rem]:items-end @[22rem]:gap-5">
        <div className="min-w-0 flex-1">
          <p className="num truncate font-display text-[28px] font-semibold leading-none tracking-[-0.03em] text-ink">{value}</p>
          {(delta || caption) && (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
              {delta}
              {caption && <span>{caption}</span>}
            </div>
          )}
        </div>
        {trend && (
          <div className="w-full @[22rem]:w-[44%] @[22rem]:max-w-[220px]">
            <Sparkline
              values={trend.values}
              labels={trend.labels}
              color={trend.color}
              format={trend.format}
              label={trend.label}
              height={48}
            />
          </div>
        )}
      </div>
    </section>
  );
}
