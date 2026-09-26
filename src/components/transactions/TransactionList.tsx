import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import { addDays } from '../../lib/dates';
import { useI18n, useToday } from '../../state/store';
import type { Transaction } from '../../types';
import { IconButton } from '../ui/Button';
import { Amount, CategoryBubble, TypeBadge, useTransactionTitle } from './TransactionBits';

interface TransactionListProps {
  transactions: Transaction[];
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  /** Auf dem Smartphone nach Tagen gruppieren (bei Sortierung nach Datum) */
  groupByDate?: boolean;
}

/** Tabelle ab 768 px, darunter eine Kartenansicht (optional nach Tagen gruppiert). */
export function TransactionList({ transactions, onEdit, onDelete, groupByDate = false }: TransactionListProps) {
  const { t } = useI18n();
  const groups = useMemo(() => {
    if (!groupByDate) return [{ date: null as string | null, items: transactions }];
    const result: { date: string | null; items: Transaction[] }[] = [];
    for (const tx of transactions) {
      const last = result[result.length - 1];
      if (last && last.date === tx.date) last.items.push(tx);
      else result.push({ date: tx.date, items: [tx] });
    }
    return result;
  }, [transactions, groupByDate]);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <caption className="sr-only">{t.transactions.tableCaption}</caption>
          <thead>
            <tr className="border-b border-line bg-surface-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.07em] text-muted">
              <th scope="col" className="py-3 pl-6 pr-3 font-semibold">
                {t.transactions.columns.date}
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                {t.transactions.columns.description}
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                {t.transactions.columns.category}
              </th>
              <th scope="col" className="hidden px-3 py-3 font-semibold xl:table-cell">
                {t.transactions.columns.paymentMethod}
              </th>
              <th scope="col" className="px-3 py-3 font-semibold">
                {t.transactions.columns.type}
              </th>
              <th scope="col" className="px-3 py-3 text-right font-semibold">
                {t.transactions.columns.amount}
              </th>
              <th scope="col" className="py-3 pl-3 pr-6 text-right font-semibold">
                <span className="sr-only">{t.transactions.columns.actions}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden">
        {groups.map((group, index) => (
          <section key={group.date ?? index} aria-label={group.date ? undefined : t.transactions.tableCaption}>
            {group.date && <DayHeading date={group.date} items={group.items} />}
            <ul className="divide-y divide-line">
              {group.items.map((tx) => (
                <TransactionCard key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} showDate={!group.date} />
              ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}

function DayHeading({ date, items }: { date: string; items: Transaction[] }) {
  const { t, f } = useI18n();
  const today = useToday();
  const label = date === today ? t.common.today : date === addDays(today, -1) ? t.common.yesterday : f.dayHeading(date);
  const net = items.reduce((sum, tx) => sum + (tx.type === 'income' ? 1 : -1) * Math.round(tx.amount * 100), 0) / 100;
  return (
    <h3 className="sticky top-[68px] z-[1] flex items-center justify-between gap-3 border-y border-line bg-surface-2/95 px-4 py-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted backdrop-blur first:border-t-0">
      <span>{label}</span>
      <span className="num normal-case tracking-normal">{f.money(net)}</span>
    </h3>
  );
}

interface RowProps {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
  showDate?: boolean;
}

function TransactionRow({ tx, onEdit, onDelete }: RowProps) {
  const { t, f } = useI18n();
  const title = useTransactionTitle()(tx);
  return (
    <tr className="group border-b border-line transition-colors last:border-b-0 hover:bg-surface-2/70">
      <td className="num whitespace-nowrap py-3 pl-6 pr-3 text-ink-2">{f.date(tx.date)}</td>
      <td className="max-w-[280px] px-3 py-3">
        <div className="flex items-center gap-3">
          <CategoryBubble category={tx.category} type={tx.type} size="sm" />
          <span className={`truncate font-medium ${tx.description ? 'text-ink' : 'text-muted'}`}>{title}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-3 text-ink-2">{t.categories[tx.category]}</td>
      <td className="hidden whitespace-nowrap px-3 py-3 text-ink-2 xl:table-cell">
        {tx.paymentMethod ? t.paymentMethods[tx.paymentMethod] : <span className="text-muted">—</span>}
      </td>
      <td className="px-3 py-3">
        <TypeBadge type={tx.type} />
      </td>
      <td className="px-3 py-3 text-right">
        <Amount amount={tx.amount} type={tx.type} />
      </td>
      <td className="py-2 pl-3 pr-5">
        <div className="flex justify-end gap-0.5">
          <IconButton icon={Pencil} size="sm" tone="primary" label={t.transactions.editLabel(title)} onClick={() => onEdit(tx)} />
          <IconButton icon={Trash2} size="sm" tone="danger" label={t.transactions.deleteLabel(title)} onClick={() => onDelete(tx)} />
        </div>
      </td>
    </tr>
  );
}

function TransactionCard({ tx, onEdit, onDelete, showDate = true }: RowProps) {
  const { t, f } = useI18n();
  const title = useTransactionTitle()(tx);
  const meta = [
    t.categories[tx.category],
    showDate ? f.date(tx.date) : null,
    tx.paymentMethod ? t.paymentMethods[tx.paymentMethod] : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <CategoryBubble category={tx.category} type={tx.type} />
      <div className="min-w-0 flex-1">
        <p className={`truncate font-semibold ${tx.description ? 'text-ink' : 'text-muted'}`}>{title}</p>
        <p className="truncate text-[13px] text-muted">
          <span className="sr-only">{tx.type === 'income' ? t.common.incomeSingular : t.common.expenseSingular}, </span>
          {meta}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end">
        <Amount amount={tx.amount} type={tx.type} className="text-[15px]" />
        <div className="-mr-2 mt-0.5 flex">
          <IconButton icon={Pencil} size="sm" tone="primary" label={t.transactions.editLabel(title)} onClick={() => onEdit(tx)} />
          <IconButton icon={Trash2} size="sm" tone="danger" label={t.transactions.deleteLabel(title)} onClick={() => onDelete(tx)} />
        </div>
      </div>
    </li>
  );
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav
      aria-label={t.transactions.pagination.label}
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-6"
    >
      <p className="num text-sm text-muted" aria-live="polite">
        {t.transactions.pagination.range(from, to, total)}
      </p>
      <div className="flex items-center gap-2">
        <span className="num hidden text-sm text-muted sm:inline">{t.transactions.pagination.page(page, pages)}</span>
        <IconButton
          icon={ChevronLeft}
          label={t.transactions.pagination.previous}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="border border-line"
        />
        <IconButton
          icon={ChevronRight}
          label={t.transactions.pagination.next}
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="border border-line"
        />
      </div>
    </nav>
  );
}
