import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react';

interface DeltaProps {
  /** Veränderung – Vorzeichen bestimmt die Richtung */
  value: number;
  /** Bereits formatierter Text, z. B. „+8,4 %“ */
  text: string;
  /** true: ein Anstieg ist positiv (z. B. Einnahmen); false: ein Anstieg ist negativ (Ausgaben) */
  upIsGood?: boolean;
}

/** Kleiner Indikator für positive/negative Veränderungen (Farbe + Pfeil + Text). */
export function Delta({ value, text, upIsGood = true }: DeltaProps) {
  const rounded = Math.round(value * 10) / 10;
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const good = direction === 'flat' ? null : (direction === 'up') === upIsGood;
  const Icon = direction === 'up' ? ArrowUpRight : direction === 'down' ? ArrowDownRight : Minus;
  const tone =
    good === null
      ? 'bg-surface-3 text-ink-2'
      : good
        ? 'bg-income-soft text-income-ink'
        : 'bg-expense-soft text-expense-ink';
  return (
    <span className={`num inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      <Icon className="size-3.5" aria-hidden="true" strokeWidth={2.5} />
      {text}
    </span>
  );
}
