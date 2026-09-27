import {
  Check,
  ChevronRight,
  Database,
  Download,
  FileUp,
  Flag,
  Globe,
  Info,
  Landmark,
  type LucideIcon,
  Monitor,
  Moon,
  PencilLine,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import { type CSSProperties, type FormEvent, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Avatar } from '../components/layout/Navigation';
import { Button } from '../components/ui/Button';
import { PageIntro } from '../components/ui/Card';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { Field, fieldAria } from '../components/ui/Field';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { MESSAGES } from '../i18n';
import { balanceUntil } from '../lib/calculations';
import { LOCALES } from '../lib/format';
import { amountToInput, parseSignedAmount } from '../lib/money';
import { CURRENCIES, NAME_MAX, sanitizeData, serializeData } from '../lib/storage';
import { useActions, useData, useI18n } from '../state/store';
import type { Currency, Language, ThemePreference } from '../types';

/** Symbol wie in der Einstellungen-App: farbiges abgerundetes Quadrat. */
function SettingsIcon({ icon: Icon, tint }: { icon: LucideIcon; tint: string }) {
  return (
    <span className="grid size-[29px] shrink-0 place-items-center rounded-[7px] text-white" style={{ background: tint }} aria-hidden="true">
      <Icon className="size-[17px]" strokeWidth={2.2} />
    </span>
  );
}

/** Gruppierte Liste mit Überschrift und Fußnote (inset grouped). */
function SettingsGroup({
  title,
  footer,
  inset = 16,
  children,
}: {
  title: string;
  footer?: ReactNode;
  inset?: number;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="group-header">
        {title}
      </h2>
      <div className="group-list" style={{ '--row-inset': `${inset}px` } as CSSProperties}>
        {children}
      </div>
      {footer && <div className="group-footer">{footer}</div>}
    </section>
  );
}

/** Mini-Vorschau für Hell/Dunkel wie unter „Anzeige & Helligkeit“. */
function ThemePreview({ mode }: { mode: ThemePreference }) {
  const pane = (dark: boolean) => (
    <div className={`flex h-full min-w-0 flex-col gap-1 p-1.5 ${dark ? 'bg-black' : 'bg-[#f2f2f7]'}`}>
      <div className={`h-1.5 w-7 rounded-full ${dark ? 'bg-[#3a3a3c]' : 'bg-[#d1d1d6]'}`} />
      <div className={`flex-1 rounded-[5px] p-1.5 ${dark ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
        <div className="h-1.5 w-3/4 rounded-full bg-[#0a84ff]" />
        <div className={`mt-1 h-1.5 w-1/2 rounded-full ${dark ? 'bg-[#3a3a3c]' : 'bg-[#e5e5ea]'}`} />
        <div className={`mt-1 h-1.5 w-2/3 rounded-full ${dark ? 'bg-[#3a3a3c]' : 'bg-[#e5e5ea]'}`} />
      </div>
    </div>
  );
  return (
    <div
      className="grid h-[76px] w-full max-w-[112px] overflow-hidden rounded-[10px] shadow-[0_0_0_0.5px_var(--separator),0_2px_8px_-2px_rgb(0_0_0/0.18)]"
      style={{ gridTemplateColumns: mode === 'system' ? '1fr 1fr' : '1fr' }}
      aria-hidden="true"
    >
      {mode === 'system' ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(mode === 'dark')
      )}
    </div>
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

  const nameChanged = name.trim() !== settings.name;

  return (
    <div className="mx-auto max-w-[760px] space-y-8">
      <PageIntro title={t.nav.settings} subtitle={t.settings.subtitle} />

      <div className="group-list">
        <div className="flex items-center gap-4 p-4">
          <Avatar name={settings.name} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[22px] font-semibold tracking-[-0.025em] text-ink">{settings.name}</p>
            <p className="text-[13px] text-muted">
              {t.app.accountType} · {t.app.localOnly}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={saveName} noValidate>
        <SettingsGroup
          title={t.settings.profile}
          inset={58}
          footer={
            nameError ? (
              <p id={`${id}-name-error`} className="font-medium text-danger-ink">
                {nameError}
              </p>
            ) : (
              t.settings.profileText
            )
          }
        >
          <div className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 transition-colors focus-within:bg-fill/60">
            <SettingsIcon icon={UserRound} tint="#8e8e93" />
            <label htmlFor={`${id}-name`} className="shrink-0 text-[16px] text-ink">
              {t.settings.name}
            </label>
            <input
              {...fieldAria(`${id}-name`, nameError)}
              type="text"
              className="min-w-[8rem] flex-1 bg-transparent py-1.5 text-right text-[16px] text-ink outline-none placeholder:text-muted focus-visible:outline-none aria-[invalid=true]:text-danger-ink"
              maxLength={NAME_MAX}
              autoComplete="name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (nameError) setNameError(null);
              }}
            />
            {nameChanged && (
              <Button type="submit" size="sm" className="animate-fade">
                {t.settings.saveName}
              </Button>
            )}
          </div>
        </SettingsGroup>
      </form>

      <SettingsGroup
        title={t.settings.balance}
        inset={58}
        footer={
          balanceError ? (
            <p id={`${id}-balance-error`} className="font-medium text-danger-ink">
              {balanceError}
            </p>
          ) : (
            t.settings.balanceText
          )
        }
      >
        <div className="flex min-h-12 items-center gap-3 px-4 py-2">
          <SettingsIcon icon={Landmark} tint="#007aff" />
          <span className="min-w-0 flex-1 truncate text-[16px] text-ink">{t.settings.currentBalance}</span>
          <span className="num text-[16px] font-semibold text-ink">{f.money(currentBalance)}</span>
        </div>
        <div className="flex min-h-12 items-center gap-3 px-4 py-2">
          <SettingsIcon icon={Flag} tint="#5856d6" />
          <span className="min-w-0 flex-1 truncate text-[16px] text-ink">{t.settings.openingBalance}</span>
          <span className="num text-[16px] text-muted">{f.money(data.account.openingBalance ?? 0)}</span>
        </div>
        <form
          onSubmit={saveBalance}
          noValidate
          className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 transition-colors focus-within:bg-fill/60"
        >
          <SettingsIcon icon={PencilLine} tint="#34c759" />
          <label htmlFor={`${id}-balance`} className="shrink-0 text-[16px] text-ink">
            {t.settings.newBalance}
          </label>
          <div className="flex min-w-[8rem] flex-1 items-center justify-end gap-1">
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
              className="num w-full min-w-0 bg-transparent py-1.5 text-right text-[16px] text-ink outline-none placeholder:text-muted/70 focus-visible:outline-none aria-[invalid=true]:text-danger-ink"
            />
            <span className="text-[16px] text-muted" aria-hidden="true">
              {f.currencySymbol}
            </span>
          </div>
          <Button type="submit" size="sm" disabled={!balanceInput.trim()}>
            {t.settings.saveBalance}
          </Button>
        </form>
      </SettingsGroup>

      <fieldset>
        <legend className="group-header">{t.settings.currency}</legend>
        <div className="group-list [--row-inset:58px]">
          {CURRENCIES.map((currency) => {
            const selected = currency === settings.currency;
            return (
              <label
                key={currency}
                className="relative flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-fill active:bg-fill-strong has-[input:focus-visible]:bg-fill has-[input:focus-visible]:shadow-[inset_0_0_0_2px_var(--focus)]"
              >
                <input
                  type="radio"
                  name={`${id}-currency`}
                  value={currency}
                  checked={selected}
                  onChange={() => changeCurrency(currency)}
                  className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0"
                />
                <span
                  className="grid size-[29px] shrink-0 place-items-center rounded-[7px] bg-[#34c759] text-[13px] font-bold text-white"
                  aria-hidden="true"
                >
                  <span className={currencySymbols[currency].length > 1 ? 'text-[9.5px]' : ''}>{currencySymbols[currency]}</span>
                </span>
                <span className="min-w-0 flex-1 leading-tight">
                  <span className="block truncate text-[16px] text-ink">{t.settings.currencies[currency]}</span>
                  <span className="block text-[13px] text-muted">{currency}</span>
                </span>
                {selected && <Check className="size-5 shrink-0 text-primary-text" aria-hidden="true" strokeWidth={2.6} />}
              </label>
            );
          })}
        </div>
        <p className="group-footer">{t.settings.currencyText}</p>
      </fieldset>

      <SettingsGroup title={t.settings.theme} footer={t.settings.themeText}>
        <fieldset className="px-4 pb-4 pt-3">
          <legend className="sr-only">{t.settings.theme}</legend>
          <div className="grid grid-cols-3 gap-3">
            {(['light', 'dark', 'system'] as const).map((mode) => {
              const selected = settings.theme === mode;
              const Icon = mode === 'light' ? Sun : mode === 'dark' ? Moon : Monitor;
              return (
                <label
                  key={mode}
                  className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-[12px] p-1.5 text-center transition-colors hover:bg-fill has-[input:focus-visible]:bg-fill has-[input:focus-visible]:shadow-[inset_0_0_0_2px_var(--focus)]"
                >
                  <input
                    type="radio"
                    name={`${id}-theme`}
                    value={mode}
                    checked={selected}
                    onChange={() => changeTheme(mode)}
                    className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0"
                  />
                  <ThemePreview mode={mode} />
                  <span className="flex items-center gap-1 text-[14px] text-ink">
                    <Icon className="size-3.5 text-muted" aria-hidden="true" />
                    {t.settings.themes[mode]}
                  </span>
                  <span
                    className={`grid size-[22px] place-items-center rounded-full transition-colors ${
                      selected ? 'bg-primary text-white' : 'shadow-[inset_0_0_0_1.5px_var(--line-strong)]'
                    }`}
                    aria-hidden="true"
                  >
                    {selected && <Check className="size-3.5" strokeWidth={3.2} />}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      </SettingsGroup>

      <fieldset>
        <legend className="group-header">{t.settings.language}</legend>
        <div className="group-list [--row-inset:58px]">
          {(['de', 'en'] as const).map((code) => {
            const selected = settings.language === code;
            return (
              <label
                key={code}
                className="relative flex min-h-12 cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-fill active:bg-fill-strong has-[input:focus-visible]:bg-fill has-[input:focus-visible]:shadow-[inset_0_0_0_2px_var(--focus)]"
              >
                <input
                  type="radio"
                  name={`${id}-language`}
                  value={code}
                  checked={selected}
                  onChange={() => changeLanguage(code)}
                  className="absolute inset-0 z-10 m-0 size-full cursor-pointer appearance-none opacity-0"
                />
                <SettingsIcon icon={Globe} tint="#007aff" />
                <span className="min-w-0 flex-1 truncate text-[16px] text-ink" lang={code}>
                  {t.settings.languages[code]}
                </span>
                {selected && <Check className="size-5 shrink-0 text-primary-text" aria-hidden="true" strokeWidth={2.6} />}
              </label>
            );
          })}
        </div>
      </fieldset>

      <SettingsGroup
        title={t.settings.data}
        inset={58}
        footer={t.settings.dataText}
      >
        <div className="flex min-h-12 items-center gap-3 px-4 py-2">
          <SettingsIcon icon={Database} tint="#8e8e93" />
          <span className="num min-w-0 flex-1 text-[15px] text-ink">
            {t.settings.stats(data.transactions.length, data.budgets.length, data.goals.length)}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setExportOpen(true)}
          className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-fill active:bg-fill-strong"
        >
          <SettingsIcon icon={Download} tint="#007aff" />
          <span className="min-w-0 flex-1 truncate text-[16px] text-ink">{t.settings.exportData}</span>
          <ChevronRight className="size-4 shrink-0 text-muted/60" aria-hidden="true" strokeWidth={2.6} />
        </button>
        <button
          type="button"
          onClick={() => setImportOpen(true)}
          className="flex min-h-12 w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-fill active:bg-fill-strong"
        >
          <SettingsIcon icon={Upload} tint="#34c759" />
          <span className="min-w-0 flex-1 truncate text-[16px] text-ink">{t.settings.importData}</span>
          <ChevronRight className="size-4 shrink-0 text-muted/60" aria-hidden="true" strokeWidth={2.6} />
        </button>
      </SettingsGroup>

      <SettingsGroup
        title={t.settings.dangerZone}
        footer={
          <>
            {t.settings.resetDemoText} {t.settings.clearAllText}
          </>
        }
      >
        <button
          type="button"
          onClick={resetDemo}
          className="flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left text-[16px] text-primary-text transition-colors hover:bg-fill active:bg-fill-strong"
        >
          <RotateCcw className="size-[18px] shrink-0" aria-hidden="true" strokeWidth={2.2} />
          {t.settings.resetDemo}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left text-[16px] text-danger-ink transition-colors hover:bg-fill active:bg-fill-strong"
        >
          <Trash2 className="size-[18px] shrink-0" aria-hidden="true" strokeWidth={2.2} />
          {t.settings.clearAll}
        </button>
      </SettingsGroup>

      <SettingsGroup title={t.settings.about} inset={58} footer={t.settings.aboutText}>
        <div className="flex min-h-12 items-center gap-3 px-4 py-2">
          <SettingsIcon icon={Info} tint="#8e8e93" />
          <span className="min-w-0 flex-1 text-[16px] text-ink">Klarissa</span>
          <span className="text-[16px] text-muted">1.0</span>
        </div>
      </SettingsGroup>

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
      cancelLabel={t.common.close}
      confirm={{ label: t.settings.copyShort, onClick: copy }}
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
      confirm={{ label: t.settings.importSubmit, form: `${id}-form` }}
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
