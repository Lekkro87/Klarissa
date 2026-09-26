import { Banknote, Coins, List, Minus, Plus, RotateCcw, WalletMinimal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
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
      className="relative grid h-10 w-16 shrink-0 place-items-center overflow-hidden rounded-lg text-[12px] font-bold text-white shadow-[0_2px_6px_-2px_rgb(0_0_0/0.35)]"
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
    <li
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border p-3 transition-colors ${
        count > 0 ? 'border-line bg-surface' : 'border-line/70 bg-surface-2/60'
      }`}
    >
      {item.kind === 'note' ? (
        <NoteVisual label={label} index={index} total={total} />
      ) : (
        <CoinVisual label={label} cents={item.cents} />
      )}
      <div className="min-w-0 flex-1 basis-16">
        <p className="truncate font-display text-[15px] font-semibold text-ink">{label}</p>
        <p className="num truncate text-[12.5px] text-muted">
          {count > 0 ? `${count} × ${label} = ${f.money((count * item.cents) / 100)}` : t.cash.none}
        </p>
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <IconButton
          icon={Minus}
          size="sm"
          variant="outline"
          label={t.cash.decrease(label)}
          disabled={count === 0}
          onClick={() => set(count - 1)}
        />
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
          className="num h-9 w-12 rounded-[10px] border border-line bg-surface text-center text-[15px] font-semibold text-ink outline-none focus:border-primary focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_22%,transparent)]"
        />
        <IconButton icon={Plus} size="sm" variant="outline" label={t.cash.increase(label)} onClick={() => set(count + 1)} />
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
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="cash-total-title" className="text-sm font-medium text-white/75">
                {t.cash.total}
              </h2>
              <p className="mt-3 truncate font-display text-[40px] font-semibold leading-none tracking-[-0.045em] text-white sm:text-[48px]">
                {f.money(summary.total)}
              </p>
            </div>
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15" aria-hidden="true">
              <WalletMinimal className="size-5" />
            </span>
          </div>
          <div className="relative mt-4 flex flex-wrap items-center gap-2 text-[13px] text-white/75">
            <span className="rounded-full bg-white/12 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-white/15">
              {t.cash.separate}
            </span>
            <span>{updatedText}</span>
          </div>
          <div className="relative mt-auto pt-7">
            <div
              className="flex h-2.5 w-full gap-[3px] overflow-hidden rounded-full bg-white/10"
              role="img"
              aria-label={`${t.cash.split}: ${t.cash.notes} ${f.money(summary.notesTotal)}, ${t.cash.coins} ${f.money(summary.coinsTotal)}`}
            >
              {summary.total > 0 && (
                <>
                  <span className="h-full rounded-full bg-[#86efc4] transition-[width] duration-500" style={{ width: `${notesShare}%` }} />
                  <span className="h-full flex-1 rounded-full bg-[#fcd98a]" />
                </>
              )}
            </div>
            <div className="mt-3 flex flex-wrap justify-between gap-x-4 gap-y-1 text-[13px] text-white/80">
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#86efc4]" aria-hidden="true" />
                {t.cash.notes}: <strong className="num font-semibold text-white">{f.money(summary.notesTotal)}</strong>
              </span>
              <span className="flex items-center gap-2">
                <span className="size-2.5 rounded-full bg-[#fcd98a]" aria-hidden="true" />
                {t.cash.coins}: <strong className="num font-semibold text-white">{f.money(summary.coinsTotal)}</strong>
              </span>
            </div>
          </div>
        </section>

        <Card className="xl:col-span-7">
          <CardHeader title={t.cash.monthTitle} subtitle={f.monthYear(ymOf(today))} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-surface-2 px-4 py-3.5">
              <p className="text-[13px] font-semibold text-muted">{t.cash.spentCash}</p>
              <p className="num mt-1 font-display text-[24px] font-semibold tracking-[-0.03em] text-expense-ink">
                {f.signedMoney(month.spent, 'expense')}
              </p>
            </div>
            <div className="rounded-2xl bg-surface-2 px-4 py-3.5">
              <p className="text-[13px] font-semibold text-muted">{t.cash.receivedCash}</p>
              <p className="num mt-1 font-display text-[24px] font-semibold tracking-[-0.03em] text-income-ink">
                {f.signedMoney(month.received, 'income')}
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-muted">{t.cash.monthText}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-ink-2">{t.cash.transactionsCount(month.count)}</span>
            <Button
              variant="soft"
              size="sm"
              icon={List}
              onClick={() => ui.showTransactions({ paymentMethod: 'cash', period: 'month' })}
            >
              {t.cash.showTransactions}
            </Button>
          </div>
        </Card>
      </div>

      <p className="rounded-2xl border border-dashed border-line-strong px-4 py-3 text-sm text-muted">{t.cash.tip}</p>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader
            title={t.cash.notes}
            subtitle={t.cash.summary(summary.notesCount, f.money(summary.notesTotal))}
            actions={<Banknote className="size-5 text-muted" aria-hidden="true" />}
          />
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {notes.map((item, index) => (
              <DenominationRow key={item.key} item={item} index={index} total={notes.length} />
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader
            title={t.cash.coins}
            subtitle={t.cash.summary(summary.coinsCount, f.money(summary.coinsTotal))}
            actions={<Coins className="size-5 text-muted" aria-hidden="true" />}
          />
          <ul className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            {coins.map((item, index) => (
              <DenominationRow key={item.key} item={item} index={index} total={coins.length} />
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
