import { Banknote, Coins, Info, List, Minus, Plus, RotateCcw, WalletMinimal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, CardHeader, PageIntro } from '../components/ui/Card';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { useToast } from '../components/ui/Toast';
import { DENOMINATIONS, type Denomination, formatDenomination, MAX_PIECES, summarizeCash } from '../lib/cash';
import { isInRange, monthRange, toISODate, ymOf } from '../lib/dates';
import { toCents } from '../lib/money';
import { useActions, useData, useI18n, useToday } from '../state/store';
import { useAppUi } from '../state/ui';

/** Farben der Geldscheine (angelehnt an die Euro-Scheine), rein dekorativ. */
const NOTE_COLORS = ['#7b5ea7', '#a8841c', '#3f9a5a', '#d9822b', '#3f6fb5', '#c8514a', '#7d8490'];

function NoteVisual({ label, index, total }: { label: string; index: number; total: number }) {
  // Der kleinste Schein ist immer grau, größere Scheine folgen der Euro-Farbreihe.
  const color = NOTE_COLORS[Math.min(NOTE_COLORS.length - 1, Math.max(0, NOTE_COLORS.length - total + index))];
  return (
    <span
      aria-hidden="true"
      className="relative grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-[7px] text-[12px] font-bold text-white shadow-[0_1px_3px_rgb(0_0_0/0.25)]"
      style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 80%, white) 0%, ${color} 70%)` }}
    >
      <span className="absolute inset-[3px] rounded-[5px] border border-white/35" />
      <span className="absolute -right-2 -top-3 size-8 rounded-full bg-white/15" />
      <span className="relative [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]">{label}</span>
    </span>
  );
}

function CoinVisual({ label, cents }: { label: string; cents: number }) {
  // Kupfer für kleine Münzen, Gold für mittlere, Bimetall für große
  const style =
    cents < 10
      ? { background: 'radial-gradient(circle at 35% 30%, #f0b08a 0%, #b8693d 55%, #8a4a26 100%)' }
      : cents < 100
        ? { background: 'radial-gradient(circle at 35% 30%, #fbe7a0 0%, #d4a93a 55%, #9c7a1f 100%)' }
        : {
            background:
              'radial-gradient(circle at 50% 50%, #e9c55a 0%, #c79a2c 46%, #d7dbe2 48%, #b9bec8 70%, #8f95a0 100%)',
          };
  return (
    <span
      aria-hidden="true"
      className="grid size-10 shrink-0 place-items-center rounded-full text-[10px] font-bold text-[#2b2410] shadow-[0_2px_6px_-2px_rgb(0_0_0/0.4),inset_0_0_0_1px_rgb(0_0_0/0.12)]"
      style={style}
    >
      <span className="[text-shadow:0_1px_0_rgb(255_255_255/0.45)]">{label}</span>
    </span>
  );
}

function DenominationRow({ item, index, total }: { item: Denomination; index: number; total: number }) {
  const { t, f, language } = useI18n();
  const { cash, settings } = useData();
  const actions = useActions();
  const [draft, setDraft] = useState<string | null>(null);
  const count = cash.counts[item.key] ?? 0;
  const label = formatDenomination(item.cents, settings.currency, language);
  const set = (next: number) => actions.setCashCount(item.key, Math.min(MAX_PIECES, Math.max(0, next)));

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
      {item.kind === 'note' ? (
        <NoteVisual label={label} index={index} total={total} />
      ) : (
        <CoinVisual label={label} cents={item.cents} />
      )}
      <div className="min-w-0 flex-1 basis-16">
        <p className={`truncate text-[16px] ${count > 0 ? 'text-ink' : 'text-muted'}`}>{label}</p>
        <p className="num truncate text-[13px] text-muted">
          {count > 0 ? (
            <>
              <span className="hidden min-[400px]:inline">
                {count} × {label} ={' '}
              </span>
              {f.money((count * item.cents) / 100)}
            </>
          ) : (
            t.cash.none
          )}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          aria-label={t.cash.countLabel(label)}
          value={draft ?? String(count)}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
            setDraft(digits);
            if (digits !== '') set(Number(digits));
          }}
          onBlur={() => {
            if (draft === '') set(0);
            setDraft(null);
          }}
          className={`num h-8 w-12 rounded-[8px] bg-transparent text-center text-[17px] outline-none transition-colors hover:bg-fill focus:bg-fill focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)] ${
            count > 0 ? 'font-semibold text-ink' : 'text-muted'
          }`}
        />
        {/* Stepper wie in iOS: grau gefüllt, zwei Hälften mit Trennlinie */}
        <div className="flex h-8 items-center rounded-[9px] bg-fill">
          <button
            type="button"
            aria-label={t.cash.decrease(label)}
            title={t.cash.decrease(label)}
            disabled={count === 0}
            onClick={() => set(count - 1)}
            className="grid h-full w-11 place-items-center rounded-l-[9px] text-ink transition-colors hover:bg-fill active:bg-fill-strong disabled:text-muted/50"
          >
            <Minus className="size-4" aria-hidden="true" strokeWidth={2.4} />
          </button>
          <span className="h-[18px] w-px bg-[var(--separator)]" aria-hidden="true" />
          <button
            type="button"
            aria-label={t.cash.increase(label)}
            title={t.cash.increase(label)}
            onClick={() => set(count + 1)}
            className="grid h-full w-11 place-items-center rounded-r-[9px] text-ink transition-colors hover:bg-fill active:bg-fill-strong"
          >
            <Plus className="size-4" aria-hidden="true" strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </li>
  );
}

export function CashPage() {
  const { t, f } = useI18n();
  const { cash, settings, transactions } = useData();
  const actions = useActions();
  const toast = useToast();
  const confirm = useConfirm();
  const ui = useAppUi();
  const today = useToday();
  const { notes, coins } = DENOMINATIONS[settings.currency];
  const summary = summarizeCash(cash.counts, settings.currency);
  const pieces = summary.notesCount + summary.coinsCount;

  const month = useMemo(() => {
    const range = monthRange(ymOf(today));
    let spent = 0;
    let received = 0;
    let count = 0;
    for (const tx of transactions) {
      if (tx.paymentMethod !== 'cash' || !isInRange(tx.date, range)) continue;
      count += 1;
      if (tx.type === 'expense') spent += toCents(tx.amount);
      else received += toCents(tx.amount);
    }
    return { spent: spent / 100, received: received / 100, count };
  }, [transactions, today]);

  const reset = async () => {
    const ok = await confirm({ title: t.cash.resetTitle, message: t.cash.resetText, confirmLabel: t.cash.resetConfirm });
    if (!ok) return;
    actions.resetCash();
    toast.show({ kind: 'success', message: t.cash.resetDone });
  };

  const notesShare = summary.total > 0 ? (summary.notesTotal / summary.total) * 100 : 0;
  const updated = cash.updatedAt ? new Date(cash.updatedAt) : null;
  const updatedText = updated
    ? t.cash.lastUpdated(
        `${f.date(toISODate(updated))}, ${updated.toLocaleTimeString(f.locale, { hour: '2-digit', minute: '2-digit' })}`,
      )
    : t.cash.neverUpdated;

  return (
    <div className="space-y-6">
      <PageIntro
        title={t.nav.cash}
        subtitle={t.cash.subtitle}
        actions={
          <Button variant="secondary" icon={RotateCcw} onClick={reset} disabled={pieces === 0}>
            {t.cash.reset}
          </Button>
        }
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <section className="cash-card flex min-h-[250px] flex-col p-6 sm:p-7 xl:col-span-5" aria-labelledby="cash-total-title">
          <div className="relative flex items-center justify-between gap-4">
            <h2 id="cash-total-title" className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em] text-white">
              <WalletMinimal className="size-5" aria-hidden="true" strokeWidth={2.2} />
              {t.cash.total}
            </h2>
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold text-white">{t.cash.separate}</span>
          </div>
          <p className="num relative mt-6 truncate font-display text-[42px] font-semibold leading-none tracking-[-0.035em] text-white sm:text-[48px]">
            {f.money(summary.total)}
          </p>
          <p className="relative mt-2.5 text-[13px] text-white/65">{updatedText}</p>
          <div className="relative mt-auto pt-7">
            <div
              className="flex h-2 w-full gap-[3px] overflow-hidden rounded-full bg-white/12"
              role="img"
              aria-label={`${t.cash.split}: ${t.cash.notes} ${f.money(summary.notesTotal)}, ${t.cash.coins} ${f.money(summary.coinsTotal)}`}
            >
              {summary.total > 0 && (
                <>
                  <span className="h-full rounded-full bg-[#30d158] transition-[width] duration-500" style={{ width: `${notesShare}%` }} />
                  <span className="h-full flex-1 rounded-full bg-[#ffd60a]" />
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] text-white/75">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#30d158]" aria-hidden="true" />
                {t.cash.notes}: <strong className="num font-semibold text-white">{f.money(summary.notesTotal)}</strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-[#ffd60a]" aria-hidden="true" />
                {t.cash.coins}: <strong className="num font-semibold text-white">{f.money(summary.coinsTotal)}</strong>
              </span>
            </div>
          </div>
        </section>

        <Card className="xl:col-span-7">
          <CardHeader title={t.cash.monthTitle} subtitle={f.monthYear(ymOf(today))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] bg-surface-2 px-4 py-3.5">
              <p className="text-[13px] text-muted">{t.cash.spentCash}</p>
              <p className="num mt-1 font-display text-[24px] font-semibold tracking-[-0.03em] text-expense-ink">
                {f.signedMoney(month.spent, 'expense')}
              </p>
            </div>
            <div className="rounded-[14px] bg-surface-2 px-4 py-3.5">
              <p className="text-[13px] text-muted">{t.cash.receivedCash}</p>
              <p className="num mt-1 font-display text-[24px] font-semibold tracking-[-0.03em] text-income-ink">
                {f.signedMoney(month.received, 'income')}
              </p>
            </div>
          </div>
          <p className="mt-4 text-[13px] text-muted">{t.cash.monthText}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[14px] font-medium text-ink-2">{t.cash.transactionsCount(month.count)}</span>
            <Button
              variant="secondary"
              size="sm"
              icon={List}
              onClick={() => ui.showTransactions({ paymentMethod: 'cash', period: 'month' })}
            >
              {t.cash.showTransactions}
            </Button>
          </div>
        </Card>
      </div>

      <p className="flex items-start gap-2 px-4 text-[13px] text-muted">
        <Info className="mt-0.5 size-4 shrink-0 text-primary-text" aria-hidden="true" />
        {t.cash.tip}
      </p>

      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section aria-labelledby="cash-notes-title">
          <div className="mb-1.5 flex items-end justify-between gap-3 px-4">
            <h2 id="cash-notes-title" className="flex items-center gap-1.5 text-[13px] uppercase tracking-[0.02em] text-muted">
              <Banknote className="size-4" aria-hidden="true" />
              {t.cash.notes}
            </h2>
            <p className="num text-[13px] text-muted">{t.cash.summary(summary.notesCount, f.money(summary.notesTotal))}</p>
          </div>
          <ul className="group-list inset-rows [--row-inset:92px]">
            {notes.map((item, index) => (
              <DenominationRow key={item.key} item={item} index={index} total={notes.length} />
            ))}
          </ul>
        </section>
        <section aria-labelledby="cash-coins-title">
          <div className="mb-1.5 flex items-end justify-between gap-3 px-4">
            <h2 id="cash-coins-title" className="flex items-center gap-1.5 text-[13px] uppercase tracking-[0.02em] text-muted">
              <Coins className="size-4" aria-hidden="true" />
              {t.cash.coins}
            </h2>
            <p className="num text-[13px] text-muted">{t.cash.summary(summary.coinsCount, f.money(summary.coinsTotal))}</p>
          </div>
          <ul className="group-list inset-rows [--row-inset:68px]">
            {coins.map((item, index) => (
              <DenominationRow key={item.key} item={item} index={index} total={coins.length} />
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
