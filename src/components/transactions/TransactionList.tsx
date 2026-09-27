import { ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { type PointerEvent as ReactPointerEvent, type ReactNode, useMemo, useRef, useState } from 'react';
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

/** Tabelle wie in macOS ab 768 px, darunter gruppierte iOS-Listen (optional nach Tagen). */
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
        <table className="w-full min-w-[640px] border-collapse text-[14px]">
          <caption className="sr-only">{t.transactions.tableCaption}</caption>
          <thead>
            <tr className="text-left text-[12px] text-muted shadow-[inset_0_-0.5px_0_var(--separator)]">
              <th scope="col" className="py-2.5 pl-5 pr-3 font-semibold">
                {t.transactions.columns.date}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {t.transactions.columns.description}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {t.transactions.columns.category}
              </th>
              <th scope="col" className="hidden px-3 py-2.5 font-semibold xl:table-cell">
                {t.transactions.columns.paymentMethod}
              </th>
              <th scope="col" className="px-3 py-2.5 font-semibold">
                {t.transactions.columns.type}
              </th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">
                {t.transactions.columns.amount}
              </th>
              <th scope="col" className="py-2.5 pl-3 pr-5 text-right font-semibold">
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

      <div className="space-y-6 md:hidden">
        {groups.map((group, index) => (
          <section key={group.date ?? index} aria-label={group.date ? undefined : t.transactions.tableCaption}>
            {group.date && <DayHeading date={group.date} items={group.items} />}
            <ul className="group-list inset-rows [--row-inset:68px]">
              {group.items.map((tx) => (
                <TransactionCell key={tx.id} tx={tx} onEdit={onEdit} onDelete={onDelete} showDate={!group.date} />
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
    <h3 className="group-header flex items-center justify-between gap-3">
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
    <tr className="transition-colors even:bg-[var(--row-alt)] hover:bg-fill" onDoubleClick={() => onEdit(tx)}>
      <td className="num whitespace-nowrap py-2 pl-5 pr-3 text-muted">{f.date(tx.date)}</td>
      <td className="max-w-[280px] px-3 py-2">
        <div className="flex items-center gap-2.5">
          <CategoryBubble category={tx.category} type={tx.type} size="sm" />
          <span className={`truncate font-medium ${tx.description ? 'text-ink' : 'text-muted'}`}>{title}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-ink-2">{t.categories[tx.category]}</td>
      <td className="hidden whitespace-nowrap px-3 py-2 text-ink-2 xl:table-cell">
        {tx.paymentMethod ? t.paymentMethods[tx.paymentMethod] : <span className="text-muted">—</span>}
      </td>
      <td className="px-3 py-2">
        <TypeBadge type={tx.type} />
      </td>
      <td className="px-3 py-2 text-right">
        <Amount amount={tx.amount} type={tx.type} />
      </td>
      <td className="py-1 pl-3 pr-4">
        <div className="flex justify-end">
          <IconButton icon={Pencil} size="sm" tone="primary" label={t.transactions.editLabel(title)} onClick={() => onEdit(tx)} />
          <IconButton icon={Trash2} size="sm" tone="danger" label={t.transactions.deleteLabel(title)} onClick={() => onDelete(tx)} />
        </div>
      </td>
    </tr>
  );
}

/** Listenzeile im iOS-Stil: Tippen öffnet die Bearbeitung, Wischen nach links zeigt „Löschen“. */
function TransactionCell({ tx, onEdit, onDelete, showDate = true }: RowProps) {
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
    <SwipeToDelete label={t.common.delete} onDelete={() => onDelete(tx)}>
      <button
        type="button"
        onClick={() => onEdit(tx)}
        aria-label={t.transactions.editLabel(title)}
        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors active:bg-fill"
      >
        <CategoryBubble category={tx.category} type={tx.type} />
        <span className="min-w-0 flex-1">
          <span className={`block truncate text-[16px] ${tx.description ? 'text-ink' : 'text-muted'}`}>{title}</span>
          <span className="block truncate text-[13px] text-muted">
            <span className="sr-only">{tx.type === 'income' ? t.common.incomeSingular : t.common.expenseSingular}, </span>
            {meta}
          </span>
        </span>
        <Amount amount={tx.amount} type={tx.type} className="text-[16px] font-medium" />
        <ChevronRight className="-mr-1 size-4 shrink-0 text-muted/50" aria-hidden="true" strokeWidth={2.6} />
      </button>
    </SwipeToDelete>
  );
}

const ACTION_WIDTH = 88;

/**
 * Wisch-Geste für Touch-Geräte. Die Aktion ist zusätzlich im Bearbeiten-Sheet
 * erreichbar, damit sie nicht nur per Geste verfügbar ist.
 */
function SwipeToDelete({ children, label, onDelete }: { children: ReactNode; label: string; onDelete: () => void }) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; base: number; axis: 'x' | 'y' | null } | null>(null);
  const swiped = useRef(false);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'touch') return;
    gesture.current = { x: event.clientX, y: event.clientY, base: offset, axis: null };
    swiped.current = false;
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (current.axis === null) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        current.axis = 'x';
        setDragging(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      } else if (Math.abs(dy) > 8) {
        current.axis = 'y';
      }
    }
    if (current.axis === 'x') {
      swiped.current = true;
      setOffset(Math.max(-ACTION_WIDTH * 1.25, Math.min(0, current.base + dx)));
    }
  };

  const onPointerEnd = () => {
    const current = gesture.current;
    gesture.current = null;
    setDragging(false);
    if (current?.axis === 'x') setOffset((value) => (value < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0));
  };

  const open = offset < 0;

  return (
    <li className="relative overflow-hidden">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={() => {
          setOffset(0);
          onDelete();
        }}
        className="absolute inset-y-0 right-0 bg-danger text-[15px] font-medium text-white"
        style={{ width: Math.max(ACTION_WIDTH, -offset), visibility: open ? 'visible' : 'hidden' }}
      >
        {label}
      </button>
      <div
        className="relative bg-surface [touch-action:pan-y]"
        style={{ transform: `translateX(${offset}px)`, transition: dragging ? 'none' : 'transform 0.25s cubic-bezier(0.2, 0.9, 0.25, 1)' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(event) => {
          // Klick, der aus der Wischbewegung selbst entsteht, ignorieren
          if (swiped.current) {
            event.preventDefault();
            event.stopPropagation();
            swiped.current = false;
            return;
          }
          // Tippen auf eine geöffnete Zeile schließt sie wieder (wie in iOS)
          if (open) {
            event.preventDefault();
            event.stopPropagation();
            setOffset(0);
          }
        }}
      >
        {children}
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
      className="flex flex-wrap items-center justify-between gap-3 px-1 pt-4 md:px-5 md:py-3 md:shadow-[inset_0_0.5px_0_var(--separator)]"
    >
      <p className="num text-[13px] text-muted" aria-live="polite">
        {t.transactions.pagination.range(from, to, total)}
      </p>
      <div className="flex items-center gap-2">
        <span className="num hidden text-[13px] text-muted sm:inline">{t.transactions.pagination.page(page, pages)}</span>
        <IconButton
          icon={ChevronLeft}
          label={t.transactions.pagination.previous}
          variant="outline"
          tone="primary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <IconButton
          icon={ChevronRight}
          label={t.transactions.pagination.next}
          variant="outline"
          tone="primary"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </nav>
  );
}
