import type { BudgetLevel } from '../../lib/calculations';

export const LEVEL_COLORS: Record<BudgetLevel, string> = {
  ok: 'var(--primary)',
  warn75: 'var(--warn)',
  warn90: 'var(--serious)',
  full: 'var(--danger)',
  over: 'var(--danger)',
};

interface ProgressBarProps {
  /** Fortschritt in Prozent – Werte über 100 werden gekappt dargestellt */
  percent: number;
  label: string;
  valueText?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg';
}

const HEIGHTS = { sm: 'h-1.5', md: 'h-2', lg: 'h-2.5' };

export function ProgressBar({ percent, label, valueText, color = 'var(--primary)', size = 'md' }: ProgressBarProps) {
  const safe = Number.isFinite(percent) ? Math.max(0, percent) : 0;
  const width = Math.min(100, safe);
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(width)}
      aria-valuetext={valueText}
      className={`w-full overflow-hidden rounded-full ${HEIGHTS[size]}`}
      style={{ background: `color-mix(in srgb, ${color} 13%, var(--surface-3))` }}
    >
      <div
        className="animate-grow h-full rounded-full transition-[width,background-color] duration-500 ease-out"
        style={{
          width: `${width}%`,
          background: `linear-gradient(90deg, color-mix(in srgb, ${color} 62%, var(--surface)) 0%, ${color} 100%)`,
        }}
      />
    </div>
  );
}
