import { Bell, BellRing, CircleAlert, Menu, Moon, Search, Sun, TriangleAlert, X } from 'lucide-react';
import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import type { Route } from '../../hooks/useHashRoute';
import type { BudgetWarning } from '../../lib/calculations';
import { useData, useI18n } from '../../state/store';
import { IconButton } from '../ui/Button';
import { useWarningMessage } from '../budget/warningText';
import { Avatar } from './Navigation';

interface HeaderProps {
  route: Route;
  onOpenMenu: () => void;
  onNavigate: (route: Route) => void;
  query: string;
  onQueryChange: (query: string) => void;
  warnings: BudgetWarning[];
  unreadIds: Set<string>;
  onMarkAllRead: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function Header({
  route,
  onOpenMenu,
  onNavigate,
  query,
  onQueryChange,
  warnings,
  unreadIds,
  onMarkAllRead,
  isDark,
  onToggleTheme,
}: HeaderProps) {
  const { t } = useI18n();
  const { settings } = useData();
  const [mobileSearch, setMobileSearch] = useState(false);
  const desktopInput = useRef<HTMLInputElement>(null);
  const mobileInput = useRef<HTMLInputElement>(null);
  const searchId = useId();

  // Taste „/“ fokussiert die Suche (außer beim Tippen in Feldern)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      event.preventDefault();
      if (window.innerWidth >= 768) desktopInput.current?.focus();
      else setMobileSearch(true);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (mobileSearch) mobileInput.current?.focus();
  }, [mobileSearch]);

  const handleQuery = (value: string) => {
    onQueryChange(value);
    if (value.trim() && route !== 'transactions') onNavigate('transactions');
  };

  const searchField = (id: string, ref: RefObject<HTMLInputElement | null>, onEscape?: () => void) => (
    <div className="relative w-full">
      <label htmlFor={id} className="sr-only">
        {t.header.searchLabel}
      </label>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-muted" aria-hidden="true" />
      <input
        ref={ref}
        id={id}
        type="search"
        value={query}
        onChange={(event) => handleQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onNavigate('transactions');
          }
          if (event.key === 'Escape') {
            if (query) onQueryChange('');
            else onEscape?.();
          }
        }}
        placeholder={t.header.searchPlaceholder}
        autoComplete="off"
        className="control h-10 min-h-10 rounded-xl border-line bg-surface-2 pl-10 pr-10 text-sm"
      />
      <kbd
        className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-line bg-surface px-1.5 text-[11px] font-semibold text-muted xl:block"
        title={t.header.searchShortcut}
      >
        /
      </kbd>
    </div>
  );

  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 border-b border-line bg-[color-mix(in_srgb,var(--canvas)_86%,transparent)] backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8">
        <IconButton icon={Menu} label={t.nav.openMenu} onClick={onOpenMenu} className="-ml-2 lg:hidden" />
        <h1
          id="page-title"
          tabIndex={-1}
          className="min-w-0 flex-1 truncate font-display text-lg font-semibold tracking-[-0.02em] text-ink outline-none sm:text-xl md:flex-none"
        >
          {t.nav[route]}
        </h1>

        <div className="mx-auto hidden w-full max-w-md md:block">{searchField(`${searchId}-desktop`, desktopInput)}</div>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5 md:ml-0">
          <IconButton icon={Search} label={t.header.openSearch} onClick={() => setMobileSearch(true)} className="md:hidden" />
          <IconButton icon={isDark ? Sun : Moon} label={isDark ? t.header.toLight : t.header.toDark} onClick={onToggleTheme} />
          <NotificationMenu
            warnings={warnings}
            unreadIds={unreadIds}
            onMarkAllRead={onMarkAllRead}
            onOpenBudget={() => onNavigate('budget')}
          />
          <a
            href="#settings"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('settings');
            }}
            className="ml-1 flex items-center gap-2.5 rounded-full p-0.5 transition-colors hover:bg-surface-3 sm:rounded-xl sm:py-1 sm:pl-1 sm:pr-3"
            aria-label={t.header.profile}
            title={t.header.profile}
          >
            <Avatar name={settings.name} size="sm" />
            <span className="hidden max-w-[140px] truncate text-sm font-semibold text-ink xl:block">{settings.name}</span>
          </a>
        </div>
      </div>

      {mobileSearch && (
        <div className="animate-fade flex items-center gap-2 border-t border-line px-4 py-3 md:hidden">
          {searchField(`${searchId}-mobile`, mobileInput, () => setMobileSearch(false))}
          <IconButton icon={X} label={t.header.closeSearch} onClick={() => setMobileSearch(false)} />
        </div>
      )}
    </header>
  );
}

interface NotificationMenuProps {
  warnings: BudgetWarning[];
  unreadIds: Set<string>;
  onMarkAllRead: () => void;
  onOpenBudget: () => void;
}

function NotificationMenu({ warnings, unreadIds, onMarkAllRead, onOpenBudget }: NotificationMenuProps) {
  const { t } = useI18n();
  const message = useWarningMessage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const unread = warnings.filter((warning) => unreadIds.has(warning.id)).length;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        containerRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const label = unread > 0 ? `${t.header.notifications} – ${t.header.unread(unread)}` : t.header.notifications;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={label}
        title={t.header.notifications}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className={`relative grid size-10 place-items-center rounded-xl transition-colors ${
          open ? 'bg-surface-3 text-ink' : 'text-muted hover:bg-surface-3 hover:text-ink'
        }`}
      >
        {unread > 0 ? <BellRing className="size-5" aria-hidden="true" /> : <Bell className="size-5" aria-hidden="true" />}
        {unread > 0 && (
          <span className="animate-badge num absolute right-1 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white ring-2 ring-[var(--canvas)]">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={t.header.notifications}
          className="animate-pop absolute right-0 top-full z-40 mt-2 w-[min(calc(100vw-32px),380px)] overflow-hidden rounded-2xl border border-line bg-surface shadow-pop"
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <p className="font-display text-[15px] font-semibold text-ink">{t.header.notifications}</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="rounded-lg px-2 py-1 text-[13px] font-semibold text-primary-text hover:bg-primary-soft"
              >
                {t.header.markAllRead}
              </button>
            )}
          </div>
          {warnings.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="font-semibold text-ink">{t.header.noNotificationsTitle}</p>
              <p className="mt-1 text-sm text-muted">{t.header.noNotificationsText}</p>
            </div>
          ) : (
            <ul className="max-h-[min(60vh,420px)] divide-y divide-line overflow-y-auto">
              {warnings.map((warning) => {
                const severe = warning.level === 'over' || warning.level === 'full';
                const Icon = severe ? CircleAlert : TriangleAlert;
                const isUnread = unreadIds.has(warning.id);
                return (
                  <li key={warning.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        onOpenBudget();
                      }}
                      className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-2"
                    >
                      <span
                        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${
                          severe ? 'bg-danger-soft text-danger-ink' : 'bg-warn-soft text-warn-ink'
                        }`}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm text-ink-2">{message(warning)}</span>
                      {isUnread && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="border-t border-line p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenBudget();
              }}
              className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-primary-text hover:bg-primary-soft"
            >
              {t.header.goToBudget}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
