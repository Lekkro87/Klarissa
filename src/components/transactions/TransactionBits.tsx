import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { CATEGORY_ICONS } from '../../lib/categories';
import { useI18n } from '../../state/store';
import type { Category, Transaction, TransactionType } from '../../types';

export function CategoryBubble({
  category,
  type,
  size = 'md',
}: {
  category: Category;
  type: TransactionType;
  size?: 'sm' | 'md';
}) {
  const Icon = CATEGORY_ICONS[category];
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-xl ${
        type === 'income' ? 'bg-income-soft text-income-ink' : 'bg-surface-3 text-ink-2'
      } ${size === 'sm' ? 'size-9' : 'size-10'}`}
    >
      <Icon className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={2} />
    </span>
  );
}

export function TypeBadge({ type }: { type: TransactionType }) {
  const { t } = useI18n();
  const Icon = type === 'income' ? ArrowDownLeft : ArrowUpRight;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        type === 'income' ? 'bg-income-soft text-income-ink' : 'bg-expense-soft text-expense-ink'
      }`}
    >
      <Icon className="size-3.5" aria-hidden="true" strokeWidth={2.5} />
      {type === 'income' ? t.common.incomeSingular : t.common.expenseSingular}
    </span>
  );
}

export function Amount({
  amount,
  type,
  className = '',
}: {
  amount: number;
  type: TransactionType;
  className?: string;
}) {
  const { f } = useI18n();
  return (
    <span className={`num whitespace-nowrap font-semibold ${type === 'income' ? 'text-income-ink' : 'text-expense-ink'} ${className}`}>
      {f.signedMoney(amount, type)}
    </span>
  );
}

/** Anzeigename einer Transaktion: Beschreibung oder – falls leer – die Kategorie. */
export function useTransactionTitle() {
  const { t } = useI18n();
  return (tx: Transaction) => tx.description || t.categories[tx.category];
}
