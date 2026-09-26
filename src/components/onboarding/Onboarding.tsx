import { Check, FlaskConical, PlusCircle, UserRound } from 'lucide-react';
import { type FormEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createFormatters } from '../../lib/format';
import { parseSignedAmount } from '../../lib/money';
import { CURRENCIES, DEFAULT_SETTINGS, NAME_MAX } from '../../lib/storage';
import { useActions, useData, useI18n } from '../../state/store';
import type { Currency, Language } from '../../types';
import { Logo } from '../layout/Navigation';
import { Button } from '../ui/Button';
import { Field, fieldAria } from '../ui/Field';
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
  const firstName = name.trim().split(/\s+/)[0] ?? '';

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

  const modes: { value: StartMode; title: string; text: string; icon: typeof PlusCircle }[] = [
    { value: 'empty', title: t.onboarding.startEmpty, text: t.onboarding.startEmptyText, icon: PlusCircle },
    { value: 'demo', title: t.onboarding.startDemo, text: t.onboarding.startDemoText, icon: FlaskConical },
  ];

  return (
    <div className="min-h-dvh px-4 pb-10 pt-5 sm:px-6 sm:pt-8">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
        <Logo />
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

      <main id="main" className="mx-auto mt-7 grid max-w-5xl gap-5 lg:mt-12 lg:grid-cols-[1fr_1.08fr] lg:gap-6">
        <section className="card animate-page p-6 sm:p-8 lg:order-2" aria-labelledby={`${id}-title`}>
          <p className="eyebrow mb-2">{t.onboarding.eyebrow}</p>
          <h1
            id={`${id}-title`}
            className="font-display text-[26px] font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-[30px]"
          >
            {t.onboarding.title}
          </h1>
          <p className="mt-2 text-[15px] text-muted">{t.onboarding.subtitle}</p>

          <form noValidate onSubmit={submit} className="mt-7 flex flex-col gap-6">
            <Field id={`${id}-balance`} label={t.onboarding.balance} error={error} hint={t.onboarding.balanceHint}>
              <div className="control flex h-16 items-center gap-2 pl-4 pr-2">
                <span className="text-xl font-semibold text-muted" aria-hidden="true">
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
                  className="num h-full w-full min-w-0 bg-transparent font-display text-2xl font-semibold tracking-[-0.02em] text-ink outline-none placeholder:text-line-strong"
                />
                <button
                  type="button"
                  onClick={toggleSign}
                  aria-label={t.onboarding.toggleSign}
                  title={t.onboarding.toggleSign}
                  className="grid h-11 shrink-0 place-items-center rounded-xl bg-surface-2 px-3 font-display text-base font-semibold text-ink-2 hover:bg-surface-3"
                >
                  ±
                </button>
                <label htmlFor={`${id}-currency`} className="sr-only">
                  {t.onboarding.currency}
                </label>
                <select
                  id={`${id}-currency`}
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value as Currency)}
                  className="h-11 shrink-0 rounded-xl border-0 bg-surface-2 px-3 text-sm font-semibold text-ink outline-none hover:bg-surface-3 focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
                >
                  {CURRENCIES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              </div>
            </Field>

            <Field id={`${id}-name`} label={t.onboarding.name} optional>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  id={`${id}-name`}
                  type="text"
                  className="control pl-10"
                  maxLength={NAME_MAX}
                  autoComplete="name"
                  placeholder={t.onboarding.namePlaceholder}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
            </Field>

            {!hasTransactions && (
              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-ink-2">{t.onboarding.startMode}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {modes.map((option) => {
                    const selected = option.value === mode;
                    const Icon = option.icon;
                    return (
                      <label
                        key={option.value}
                        className={`relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--focus)] ${
                          selected ? 'border-primary bg-primary-soft' : 'border-line hover:border-line-strong hover:bg-surface-2'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`${id}-mode`}
                          value={option.value}
                          checked={selected}
                          onChange={() => setMode(option.value)}
                          className="sr-only"
                        />
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-xl ${selected ? 'btn-primary' : 'bg-surface-3 text-ink-2'}`}
                          aria-hidden="true"
                        >
                          <Icon className="size-[18px]" />
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-sm font-semibold ${selected ? 'text-primary-text' : 'text-ink'}`}>
                            {option.title}
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-snug text-muted">{option.text}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <Button type="submit" block className="h-12 text-base">
              {t.onboarding.submit}
            </Button>
          </form>
        </section>

        <section className="hero-card flex min-h-[320px] flex-col p-6 sm:p-8 lg:order-1" aria-label={t.onboarding.previewLabel}>
          <p className="relative text-[15px] font-medium text-[var(--hero-muted)]">{t.onboarding.previewGreeting(firstName)}</p>
          <p className="relative mt-8 text-sm font-medium text-[var(--hero-muted)]">{t.onboarding.previewLabel}</p>
          <p
            className={`relative mt-2 truncate font-display text-[40px] font-semibold leading-none tracking-[-0.045em] sm:text-[52px] ${
              preview < 0 ? 'text-rose-300' : ''
            }`}
          >
            {f.money(preview)}
          </p>
          <p className="relative mt-6 max-w-sm text-[15px] leading-relaxed text-[var(--hero-muted)]">{t.onboarding.tagline}</p>
          <ul className="relative mt-auto space-y-3 pt-8">
            {t.onboarding.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-[15px]">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/12 ring-1 ring-white/20" aria-hidden="true">
                  <Check className="size-3.5" strokeWidth={3} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
