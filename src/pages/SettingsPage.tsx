import {
  ClipboardCopy,
  Database,
  Download,
  FileUp,
  Info,
  Landmark,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
  UserRound,
  Wallet,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Card, PageIntro } from '../components/ui/Card';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { Field, fieldAria } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { SegmentedControl } from '../components/ui/SegmentedControl';
import { useToast } from '../components/ui/Toast';
import { MESSAGES } from '../i18n';
import { balanceUntil } from '../lib/calculations';
import { LOCALES } from '../lib/format';
import { amountToInput, parseSignedAmount } from '../lib/money';
import { CURRENCIES, NAME_MAX, sanitizeData, serializeData } from '../lib/storage';
import { useActions, useData, useI18n } from '../state/store';
import type { Currency, Language, ThemePreference } from '../types';

function SettingsSection({
  icon: Icon,
  title,
  text,
  children,
}: {
  icon: typeof Wallet;
  title: string;
  text: string;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <Card aria-labelledby={id}>
      <div className="mb-5 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary-text" aria-hidden="true">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 id={id} className="font-display text-base font-semibold text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-sm text-muted">{text}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}

export function SettingsPage() {
  const { t, f, language } = useI18n();
  const data = useData();
  const actions = useActions();
  const toast = useToast();
  const confirm = useConfirm();
  const id = useId();
  const { settings } = data;
  const [name, setName] = useState(settings.name);
  const [nameError, setNameError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState('');
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Namen übernehmen, wenn er sich extern ändert (z. B. durch einen Import)
  useEffect(() => setName(settings.name), [settings.name]);

  const currencySymbols = useMemo(
    () =>
      Object.fromEntries(
        CURRENCIES.map((currency) => [
          currency,
          new Intl.NumberFormat(LOCALES[language], { style: 'currency', currency })
            .formatToParts(0)
            .find((part) => part.type === 'currency')?.value ?? currency,
        ]),
      ) as Record<Currency, string>,
    [language],
  );

  const currentBalance = useMemo(
    () => balanceUntil(data.transactions, undefined, data.account.openingBalance ?? 0),
    [data.transactions, data.account.openingBalance],
  );

  const saveBalance = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseSignedAmount(balanceInput, language);
    if (!parsed.ok) {
      setBalanceError(
        parsed.error === 'required'
          ? t.onboarding.balanceRequired
          : parsed.error === 'tooLarge'
            ? t.form.errors.amountTooLarge
            : t.onboarding.balanceInvalid,
      );
      return;
    }
    actions.setCurrentBalance(parsed.value);
    setBalanceInput('');
    setBalanceError(null);
    toast.show({ kind: 'success', message: t.toasts.balanceSaved });
  };

  const saveName = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(t.settings.nameRequired);
      return;
    }
    setNameError(null);
    actions.updateSettings({ name: trimmed });
    setName(trimmed.slice(0, NAME_MAX));
    toast.show({ kind: 'success', message: t.toasts.nameSaved });
  };

  const changeCurrency = (currency: Currency) => {
    if (currency === settings.currency) return;
    actions.updateSettings({ currency });
    toast.show({ kind: 'success', message: t.toasts.currencyChanged(currency) });
  };

  const changeTheme = (theme: ThemePreference) => {
    actions.updateSettings({ theme });
    toast.show({ kind: 'success', message: t.toasts.themeChanged });
  };

  const changeLanguage = (next: Language) => {
    actions.updateSettings({ language: next });
    toast.show({ kind: 'success', message: MESSAGES[next].toasts.languageChanged });
  };

  const resetDemo = async () => {
    const ok = await confirm({
      title: t.confirm.resetDemoTitle,
      message: t.confirm.resetDemoText,
      confirmLabel: t.confirm.resetDemoConfirm,
    });
    if (!ok) return;
    actions.resetDemo();
    toast.show({ kind: 'success', message: t.toasts.demoReset });
  };

  const clearAll = async () => {
    const ok = await confirm({ title: t.confirm.clearTitle, message: t.confirm.clearText, confirmLabel: t.confirm.clearConfirm });
    if (!ok) return;
    actions.clearAll();
    toast.show({ kind: 'success', message: t.toasts.dataCleared });
  };

  return (
    <div className="space-y-6">
      <PageIntro title={t.nav.settings} subtitle={t.settings.subtitle} />

      <div className="grid gap-6 xl:grid-cols-2">
        <SettingsSection icon={UserRound} title={t.settings.profile} text={t.settings.profileText}>
          <form onSubmit={saveName} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Field id={`${id}-name`} label={t.settings.name} error={nameError} className="flex-1">
              <input
                {...fieldAria(`${id}-name`, nameError)}
                type="text"
                className="control"
                maxLength={NAME_MAX}
                autoComplete="name"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (nameError) setNameError(null);
                }}
              />
            </Field>
            <Button type="submit" className="sm:mt-[30px]" disabled={name.trim() === settings.name}>
              {t.settings.saveName}
            </Button>
          </form>
        </SettingsSection>

        <SettingsSection icon={Landmark} title={t.settings.balance} text={t.settings.balanceText}>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <div className="min-w-0 rounded-2xl bg-surface-2 px-4 py-3">
              <p className="truncate text-[13px] font-semibold text-muted">{t.settings.currentBalance}</p>
              <p className="num mt-1 truncate font-display text-lg font-semibold tracking-[-0.02em] text-ink">
                {f.money(currentBalance)}
              </p>
            </div>
            <div className="min-w-0 rounded-2xl bg-surface-2 px-4 py-3">
              <p className="truncate text-[13px] font-semibold text-muted">{t.settings.openingBalance}</p>
              <p className="num mt-1 truncate font-display text-lg font-semibold tracking-[-0.02em] text-ink">
                {f.money(data.account.openingBalance ?? 0)}
              </p>
            </div>
          </div>
          <form onSubmit={saveBalance} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <Field id={`${id}-balance`} label={t.settings.newBalance} error={balanceError} className="flex-1">
              <div className="control flex items-center gap-2">
                <span className="font-semibold text-muted" aria-hidden="true">
                  {f.currencySymbol}
                </span>
                <input
                  {...fieldAria(`${id}-balance`, balanceError)}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={amountToInput(currentBalance, language)}
                  value={balanceInput}
                  onChange={(event) => {
                    setBalanceInput(event.target.value.slice(0, 22));
                    if (balanceError) setBalanceError(null);
                  }}
                  className="num h-full w-full min-w-0 bg-transparent font-semibold text-ink outline-none placeholder:text-line-strong"
                />
              </div>
            </Field>
            <Button type="submit" className="sm:mt-[30px]">
              {t.settings.saveBalance}
            </Button>
          </form>
        </SettingsSection>

        <SettingsSection icon={Wallet} title={t.settings.currency} text={t.settings.currencyText}>
          <fieldset>
            <legend className="sr-only">{t.settings.currency}</legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {CURRENCIES.map((currency) => {
                const selected = currency === settings.currency;
                return (
                  <label
                    key={currency}
                    className={`relative flex min-w-0 cursor-pointer flex-col rounded-2xl border p-3.5 transition-colors has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-[var(--focus)] ${
                      selected ? 'border-primary bg-primary-soft' : 'border-line hover:border-line-strong hover:bg-surface-2'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${id}-currency`}
                      value={currency}
                      checked={selected}
                      onChange={() => changeCurrency(currency)}
                      className="sr-only"
                    />
                    <span className={`font-display text-xl font-semibold ${selected ? 'text-primary-text' : 'text-ink'}`}>
                      {currencySymbols[currency]}
                    </span>
                    <span className="mt-1 text-sm font-semibold text-ink">{currency}</span>
                    <span className="text-xs leading-snug text-muted">{t.settings.currencies[currency]}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        </SettingsSection>

        <SettingsSection icon={Palette} title={t.settings.appearance} text={t.settings.appearanceText}>
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-2">{t.settings.theme}</p>
              <SegmentedControl
                label={t.settings.theme}
                value={settings.theme}
                onChange={changeTheme}
                size="md"
                fullWidth
                options={[
                  { value: 'light', label: t.settings.themes.light, icon: Sun },
                  { value: 'dark', label: t.settings.themes.dark, icon: Moon },
                  { value: 'system', label: t.settings.themes.system, icon: Monitor },
                ]}
              />
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink-2">{t.settings.language}</p>
              <SegmentedControl
                label={t.settings.language}
                value={settings.language}
                onChange={changeLanguage}
                size="md"
                fullWidth
                options={[
                  { value: 'de', label: t.settings.languages.de },
                  { value: 'en', label: t.settings.languages.en },
                ]}
              />
            </div>
          </div>
        </SettingsSection>
      </div>

      <SettingsSection icon={Database} title={t.settings.data} text={t.settings.dataText}>
        <p className="num mb-5 rounded-xl bg-surface-2 px-4 py-3 text-sm font-medium text-ink-2">
          {t.settings.stats(data.transactions.length, data.budgets.length, data.goals.length)}
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-2">{t.settings.backupHint}</h3>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Download} onClick={() => setExportOpen(true)}>
                {t.settings.exportData}
              </Button>
              <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>
                {t.settings.importData}
              </Button>
            </div>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-2">{t.settings.dangerZone}</h3>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-3.5">
                <p className="min-w-0 flex-1 text-sm text-muted">{t.settings.resetDemoText}</p>
                <Button variant="secondary" size="sm" icon={RotateCcw} onClick={resetDemo}>
                  {t.settings.resetDemo}
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line p-3.5">
                <p className="min-w-0 flex-1 text-sm text-muted">{t.settings.clearAllText}</p>
                <Button variant="danger" size="sm" icon={Trash2} onClick={clearAll}>
                  {t.settings.clearAll}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection icon={Info} title={t.settings.about} text={t.settings.aboutText}>
        <p className="text-sm text-muted">Klarissa 1.0 · {t.app.localOnly}</p>
      </SettingsSection>

      <ExportModal open={exportOpen} onClose={() => setExportOpen(false)} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
}

function ExportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const data = useData();
  const toast = useToast();
  const id = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const json = useMemo(() => (open ? JSON.stringify(JSON.parse(serializeData(data)), null, 2) : ''), [open, data]);

  const copy = () => {
    const selectText = () => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    };
    try {
      navigator.clipboard
        .writeText(json)
        .then(() => toast.show({ kind: 'success', message: t.toasts.copied }))
        .catch(() => {
          selectText();
          toast.show({ kind: 'info', message: t.toasts.copyFailed });
        });
    } catch {
      selectText();
      toast.show({ kind: 'info', message: t.toasts.copyFailed });
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t.settings.exportData}
      description={t.settings.exportText}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            {t.common.close}
          </Button>
          <Button icon={ClipboardCopy} onClick={copy}>
            {t.settings.copy}
          </Button>
        </>
      }
    >
      <label htmlFor={`${id}-export`} className="sr-only">
        {t.settings.exportData}
      </label>
      <textarea
        ref={textareaRef}
        id={`${id}-export`}
        readOnly
        value={json}
        spellCheck={false}
        className="control num h-72 resize-y font-mono text-xs"
        onFocus={(event) => event.currentTarget.select()}
      />
    </Modal>
  );
}

function ImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const actions = useActions();
  const toast = useToast();
  const confirm = useConfirm();
  const id = useId();
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setText('');
    setError(null);
    onClose();
  };

  const readFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setText(typeof reader.result === 'string' ? reader.result : '');
      setError(null);
    };
    reader.onerror = () => setError(t.toasts.importError);
    reader.readAsText(file);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) {
      setError(t.settings.importEmpty);
      return;
    }
    let result: ReturnType<typeof sanitizeData> = null;
    try {
      result = sanitizeData(JSON.parse(text));
    } catch {
      result = null;
    }
    if (!result) {
      setError(t.toasts.importError);
      return;
    }
    const ok = await confirm({
      title: t.confirm.importTitle,
      message: t.confirm.importText(result.data.transactions.length),
      confirmLabel: t.confirm.importConfirm,
      tone: 'primary',
    });
    if (!ok) return;
    actions.replaceData(result.data);
    toast.show({ kind: 'success', message: MESSAGES[result.data.settings.language].toasts.importSuccess(result.data.transactions.length) });
    if (result.dropped > 0) {
      toast.show({ kind: 'info', message: MESSAGES[result.data.settings.language].toasts.dataRepaired(result.dropped) });
    }
    close();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      size="lg"
      title={t.settings.importData}
      description={t.settings.importText}
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            {t.common.cancel}
          </Button>
          <Button type="submit" form={`${id}-form`} icon={Upload}>
            {t.settings.importSubmit}
          </Button>
        </>
      }
    >
      <form id={`${id}-form`} onSubmit={submit} noValidate className="flex flex-col gap-4 pb-3">
        <div>
          <input
            ref={fileRef}
            id={`${id}-file`}
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(event) => readFile(event.target.files?.[0])}
          />
          <Button variant="secondary" icon={FileUp} onClick={() => fileRef.current?.click()}>
            {t.settings.chooseFile}
          </Button>
        </div>
        <Field id={`${id}-text`} label={t.settings.importLabel} error={error}>
          <textarea
            {...fieldAria(`${id}-text`, error)}
            value={text}
            spellCheck={false}
            placeholder='{ "version": 1, "data": { "transactions": [ … ] } }'
            onChange={(event) => {
              setText(event.target.value);
              if (error) setError(null);
            }}
            className="control num h-56 resize-y font-mono text-xs"
          />
        </Field>
      </form>
    </Modal>
  );
}
