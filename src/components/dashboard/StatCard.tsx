import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type Tone = 'primary' | 'income' | 'expense' | 'neutral';

const TONES: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary-text',
  income: 'bg-income-soft text-income-ink',
  expense: 'bg-expense-soft text-expense-ink',
  neutral: 'bg-surface-3 text-ink-2',
};

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: Tone;
  /** Veränderungsindikator (z. B. <Delta />) */
  delta?: ReactNode;
  /** Vergleichstext, z. B. „gegenüber dem letzten Monat“ */
  caption?: ReactNode;
  highlight?: boolean;
}

export function StatCard({ label, value, icon: Icon, tone = 'primary', delta, caption, highlight = false }: StatCardProps) {
  return (
    <section
      className={`card group relative flex min-w-0 flex-col gap-4 p-5 transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-hover ${
        highlight ? 'overflow-hidden' : ''
      }`}
    >
      {highlight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-16 size-44 rounded-full opacity-60 blur-2xl"
          style={{ background: 'color-mix(in srgb, var(--primary) 18%, transparent)' }}
        />
      )}
      <div className="relative flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-muted">{label}</h2>
        <span className={`grid size-9 place-items-center rounded-xl ${TONES[tone]}`} aria-hidden="true">
          <Icon className="size-[18px]" strokeWidth={2.1} />
        </span>
      </div>
      <p className="relative truncate font-display text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink sm:text-[28px]">
        {value}
      </p>
      {(delta || caption) && (
        <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted">
          {delta}
          {caption && <span>{caption}</span>}
        </div>
      )}
    </section>
  );
}
