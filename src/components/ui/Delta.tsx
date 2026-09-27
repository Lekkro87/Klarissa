interface DeltaProps {
  /** Veränderung – Vorzeichen bestimmt die Richtung */
  value: number;
  /** Bereits formatierter Text, z. B. „+8,4 %“ */
  text: string;
  /** true: ein Anstieg ist positiv (z. B. Einnahmen); false: ein Anstieg ist negativ (Ausgaben) */
  upIsGood?: boolean;
}

/** Veränderungsanzeige wie in der Aktien- und Health-App (Dreieck + Wert). */
export function Delta({ value, text, upIsGood = true }: DeltaProps) {
  const rounded = Math.round(value * 10) / 10;
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat';
  const good = direction === 'flat' ? null : (direction === 'up') === upIsGood;
  const tone =
    good === null
      ? 'bg-fill text-ink-2'
      : good
        ? 'bg-income-soft text-income-ink'
        : 'bg-expense-soft text-expense-ink';
  return (
    <span className={`num inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${tone}`}>
      {direction !== 'flat' && (
        <svg viewBox="0 0 10 10" className={`size-2 ${direction === 'down' ? 'rotate-180' : ''}`} aria-hidden="true">
          <path d="M5 1.2 9.2 8.6H.8Z" fill="currentColor" />
        </svg>
      )}
      {text}
    </span>
  );
}
