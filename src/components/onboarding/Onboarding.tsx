import {
  BellRing,
  ChartColumn,
  Check,
  ChevronsUpDown,
  CircleAlert,
  FlaskConical,
  LockKeyhole,
  type LucideIcon,
  PiggyBank,
  PlusCircle,
  UserRound,
} from 'lucide-react';
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createFormatters } from '../../lib/format';
import { parseSignedAmount } from '../../lib/money';
import { CURRENCIES, DEFAULT_SETTINGS, NAME_MAX } from '../../lib/storage';
import { useActions, useData, useI18n } from '../../state/store';
import type { Currency, Language } from '../../types';
import { LogoMark } from '../layout/Navigation';
import { Button } from '../ui/Button';
import { fieldAria } from '../ui/Field';
import { SegmentedControl } from '../ui/SegmentedControl';
import { useToast } from '../ui/Toast';

type StartMode = 'empty' | 'demo';

/**
 * Einrichtung beim ersten Start: Der Nutzer muss seinen aktuellen
 * Kontostand angeben, bevor er die App verwenden kann.
 */
export function Onboarding() {
  const { t, language } = useI18n();
  const data = useData();
  const actions = useActions();
  const toast = useToast();
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const hasTransactions = data.transactions.length > 0;

  const [name, setName] = useState(data.settings.name === DEFAULT_SETTINGS.name ? '' : data.settings.name);
  const [currency, setCurrency] = useState<Currency>(data.settings.currency);
  const [balance, setBalance] = useState('');
  const [mode, setMode] = useState<StartMode>('empty');
  const [submitted, setSubmitted] = useState(false);

  // Vorschau in der gewählten Währung
  const f = useMemo(() => createFormatters(language, currency), [language, currency]);
  const parsed = parseSignedAmount(balance, language);
  const error =
    submitted && !parsed.ok
      ? parsed.error === 'required'
        ? t.onboarding.balanceRequired
        : parsed.error === 'tooLarge'
          ? t.form.errors.amountTooLarge
          : t.onboarding.balanceInvalid
      : null;
  const preview = parsed.ok ? parsed.value : 0;

  useEffect(() => {
    document.title = `${t.onboarding.title} · ${t.app.name}`;
  }, [t]);

  const toggleSign = () => {
    const trimmed = balance.trim();
    setBalance(/^[-−–]/.test(trimmed) ? trimmed.slice(1) : `−${trimmed}`);
    inputRef.current?.focus();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (!parsed.ok) {
      inputRef.current?.focus();
      return;
    }
    actions.completeOnboarding({
      name: name.slice(0, NAME_MAX),
      currency,
      balance: parsed.value,
      withDemo: !hasTransactions && mode === 'demo',
    });
    toast.show({ kind: 'success', message: t.toasts.onboardingDone });
  };

  const modes: { value: StartMode; title: string; text: string; icon: LucideIcon; tint: string }[] = [
    { value: 'empty', title: t.onboarding.startEmpty, text: t.onboarding.startEmptyText, icon: PlusCircle, tint: '#007aff' },
    { value: 'demo', title: t.onboarding.startDemo, text: t.onboarding.startDemoText, icon: FlaskConical, tint: '#af52de' },
  ];
  const featureIcons: LucideIcon[] = [ChartColumn, BellRing, PiggyBank, LockKeyhole];

  return (
    <div className="min-h-dvh px-4 pb-12 pt-4 sm:px-6">
      <div className="mx-auto flex max-w-5xl justify-end">
        <SegmentedControl<Language>
          label={t.onboarding.languageLabel}
          value={language}
          onChange={(next) => actions.updateSettings({ language: next })}
          options={[
            { value: 'de', label: 'DE' },
            { value: 'en', label: 'EN' },
          ]}
        />
      </div>

      <main
        id="main"
        className="animate-page mx-auto mt-6 grid max-w-5xl gap-8 sm:mt-10 lg:grid-cols-[1fr_1.1fr] lg:gap-x-16 lg:gap-y-10"
      >
        <div className="text-center lg:col-start-1 lg:row-start-1 lg:pt-4 lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <LogoMark size="lg" />
          </div>
          <p className="mt-6 text-[15px] font-semibold text-primary-text">{t.onboarding.eyebrow}</p>
          <h1 id={`${id}-title`} className="large-title mt-1 text-[32px] text-ink sm:text-[40px]">
            {t.onboarding.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-[17px] leading-relaxed text-muted lg:mx-0">{t.onboarding.subtitle}</p>
        </div>

        <ul className="mx-auto w-full max-w-md space-y-5 lg:col-start-1 lg:row-start-2 lg:mx-0" aria-label={t.onboarding.tagline}>
          {t.onboarding.features.map((feature, index) => {
            const Icon = featureIcons[index % featureIcons.length];
            return (
              <li key={feature} className="flex items-center gap-4">
                <Icon className="size-7 shrink-0 text-primary-text" aria-hidden="true" strokeWidth={1.9} />
                <span className="text-[15px] leading-snug text-ink-2">{feature}</span>
              </li>
            );
          })}
        </ul>

        <form
          noValidate
          onSubmit={submit}
          aria-labelledby={`${id}-title`}
          className="mx-auto w-full max-w-xl space-y-7 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mx-0"
        >
          <div>
            <label htmlFor={`${id}-balance`} className="group-header block">
              {t.onboarding.balance}
            </label>
            <div className="group-list">
              <div className="flex h-[72px] items-center gap-2 pl-4 pr-3 transition-colors focus-within:bg-fill/40">
                <span className="text-[26px] font-semibold text-muted" aria-hidden="true">
                  {f.currencySymbol}
                </span>
                <input
                  ref={inputRef}
                  {...fieldAria(`${id}-balance`, error, true)}
                  autoFocus
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  enterKeyHint="done"
                  placeholder={language === 'de' ? '2.450,80' : '2,450.80'}
                  value={balance}
                  onChange={(event) => setBalance(event.target.value.slice(0, 22))}
                  className={`num h-full w-full min-w-0 bg-transparent font-display text-[32px] font-semibold tracking-[-0.025em] outline-none placeholder:text-muted/35 focus-visible:outline-none ${
                    preview < 0 ? 'text-expense-ink' : 'text-ink'
                  }`}
                />
                <button
                  type="button"
                  onClick={toggleSign}
                  aria-label={t.onboarding.toggleSign}
                  title={t.onboarding.toggleSign}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-fill text-[19px] font-semibold text-ink transition-colors hover:bg-fill-strong active:scale-95"
                >
                  ±
                </button>
              </div>
              <div className="flex min-h-12 items-center gap-3 px-4">
                <label htmlFor={`${id}-currency`} className="min-w-0 flex-1 text-[16px] text-ink">
                  {t.onboarding.currency}
                </label>
                <div className="relative">
                  <select
                    id={`${id}-currency`}
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value as Currency)}
                    className="h-9 appearance-none rounded-[8px] bg-transparent pl-2 pr-6 text-right text-[16px] text-muted outline-none hover:bg-fill focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                  >
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                  <ChevronsUpDown
                    className="pointer-events-none absolute right-1 top-1/2 size-4 -translate-y-1/2 text-muted"
                    aria-hidden="true"
                  />
                </div>
              </div>
            </div>
            {error ? (
              <p id={`${id}-balance-error`} className="group-footer flex items-start gap-1.5 font-medium text-danger-ink" role="alert">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            ) : (
              <p id={`${id}-balance-hint`} className="group-footer">
                {balance.trim() && parsed.ok && (
                  <span className="num block font-semibold text-ink-2" aria-live="polite">
                    {t.onboarding.previewLabel}: {f.money(preview)}
                  </span>
                )}
                {t.onboarding.balanceHint}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${id}-name`} className="group-header block">
              {t.onboarding.name} <span className="normal-case tracking-normal">({t.common.optional})</span>
            </label>
            <div className="group-list">
              <div className="flex min-h-12 items-center gap-3 px-4 transition-colors focus-within:bg-fill/40">
                <UserRound className="size-5 shrink-0 text-muted" aria-hidden="true" />
                <input
                  id={`${id}-name`}
                  type="text"
                  className="h-12 w-full min-w-0 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted/70 focus-visible:outline-none"
                  maxLength={NAME_MAX}
                  autoComplete="name"
                  placeholder={t.onboarding.namePlaceholder}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </div>
          </div>

          {!hasTransactions && (
            <fieldset>
              <legend className="group-header">{t.onboarding.startMode}</legend>
              <div className="group-list [--row-inset:58px]">
                {modes.map((option) => {
                  const selected = option.value === mode;
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      className="relative flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-fill active:bg-fill-strong has-[input:focus-visible]:bg-fill has-[input:focus-visible]:shadow-[inset_0_0_0_2px_var(--focus)]"
                    >
                      <input
                        type="radio"
                        name={`${id}-mode`}
                        value={option.value}
                        checked={selected}
                        onChange={() => setMode(option.value)}
                        className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0"
                      />
                      <span
                        className="grid size-[29px] shrink-0 place-items-center rounded-[7px] text-white"
                        style={{ background: option.tint }}
                        aria-hidden="true"
                      >
                        <Icon className="size-[17px]" strokeWidth={2.2} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] text-ink">{option.title}</span>
                        <span className="mt-0.5 block text-[13px] leading-snug text-muted">{option.text}</span>
                      </span>
                      <Check
                        className={`size-5 shrink-0 text-primary-text transition-opacity ${selected ? 'opacity-100' : 'opacity-0'}`}
                        aria-hidden="true"
                        strokeWidth={2.6}
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="space-y-3 text-center">
            <Button type="submit" block className="h-[50px] text-[17px]">
              {t.onboarding.submit}
            </Button>
            <p className="text-[13px] text-muted">{t.onboarding.tagline}</p>
          </div>
        </form>
      </main>
    </div>
  );
}
