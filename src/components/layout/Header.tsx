import { Bell, CircleAlert, Plus, Search, TriangleAlert } from 'lucide-react';
import { type RefObject, useEffect, useId, useRef, useState } from 'react';
import type { Route } from '../../hooks/useHashRoute';
import type { BudgetWarning } from '../../lib/calculations';
import { useData, useI18n } from '../../state/store';
import { IconButton } from '../ui/Button';
import { useWarningMessage } from '../budget/warningText';
import { Avatar } from './Navigation';

interface HeaderProps {
  route: Route;
  onNavigate: (route: Route) => void;
  onAddTransaction: () => void;
  query: string;
  onQueryChange: (query: string) => void;
  warnings: BudgetWarning[];
  unreadIds: Set<string>;
  onMarkAllRead: () => void;
}

/** Navigationsleiste aus Glas – auf dem Smartphone mit kleinem Titel beim Scrollen (iOS). */
export function Header({
  route,
  onNavigate,
  onAddTransaction,
  query,
  onQueryChange,
  warnings,
  unreadIds,
  onMarkAllRead,
}: HeaderProps) {
  const { t } = useI18n();
  const { settings } = useData();
  const [mobileSearch, setMobileSearch] = useState(false);
  const [compact, setCompact] = useState(false);
  const desktopInput = useRef<HTMLInputElement>(null);
  const mobileInput = useRef<HTMLInputElement>(null);
  const searchId = useId();

  // Kleiner Titel erscheint, sobald der große Seitentitel unter der Leiste verschwindet
  useEffect(() => {
    const title = document.getElementById('page-title');
    if (!title || typeof IntersectionObserver === 'undefined') {
      setCompact(false);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting), {
      rootMargin: '-56px 0px 0px 0px',
    });
    observer.observe(title);
    return () => observer.disconnect();
  }, [route]);

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
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" strokeWidth={2.2} />
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
        className="control h-9 min-h-9 rounded-[10px] pl-8 pr-9 text-[15px]"
      />
      <kbd
        className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-[5px] bg-surface px-1.5 text-[11px] font-medium text-muted shadow-[0_0_0_0.5px_var(--separator)] xl:block"
        title={t.header.searchShortcut}
      >
        /
      </kbd>
    </div>
  );

  return (
    <header className="sticky top-[env(safe-area-inset-top,0px)] z-30 bg-[var(--glass-bar)] shadow-[inset_0_-0.5px_0_var(--separator)] backdrop-blur-2xl">
      <div className="relative mx-auto flex h-[52px] max-w-[1440px] items-center gap-2 px-4 sm:px-6 lg:px-8">
        <p
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-32 truncate text-center text-[17px] font-semibold tracking-[-0.02em] text-ink transition-opacity duration-200 md:hidden ${
            compact ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {t.nav[route]}
        </p>

        <div className="hidden w-full max-w-sm md:block">{searchField(`${searchId}-desktop`, desktopInput)}</div>

        <div className="ml-auto flex items-center gap-1">
          <IconButton icon={Search} label={t.header.openSearch} tone="primary" onClick={() => setMobileSearch(true)} className="md:hidden" />
          <NotificationMenu
            warnings={warnings}
            unreadIds={unreadIds}
            onMarkAllRead={onMarkAllRead}
            onOpenBudget={() => onNavigate('budget')}
          />
          <IconButton icon={Plus} label={t.actions.addTransaction} tone="primary" onClick={onAddTransaction} className="lg:hidden" />
          <a
            href="#settings"
            onClick={(event) => {
              event.preventDefault();
              onNavigate('settings');
            }}
            className="ml-1 hidden items-center gap-2 rounded-full p-0.5 pr-3 transition-colors hover:bg-fill md:flex"
            aria-label={t.header.profile}
            title={t.header.profile}
          >
            <Avatar name={settings.name} size="sm" />
            <span className="hidden max-w-[160px] truncate text-[14px] font-medium text-ink xl:block">{settings.name}</span>
          </a>
        </div>
      </div>

      {mobileSearch && (
        <div className="animate-fade flex items-center gap-2 px-4 pb-2.5 md:hidden">
          {searchField(`${searchId}-mobile`, mobileInput, () => setMobileSearch(false))}
          <button
            type="button"
            onClick={() => setMobileSearch(false)}
            className="shrink-0 rounded-full px-2 py-1 text-[17px] text-primary-text hover:bg-fill"
          >
            {t.common.cancel}
          </button>
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
        className={`relative grid size-10 place-items-center rounded-full text-primary-text transition-colors active:opacity-60 ${
          open ? 'bg-fill' : 'hover:bg-fill'
        }`}
      >
        <Bell className="size-5" aria-hidden="true" strokeWidth={2} />
        {unread > 0 && (
          <span className="animate-badge num absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-danger px-1 text-[11px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label={t.header.notifications}
          className="animate-pop material absolute right-0 top-full z-40 mt-2 w-[min(calc(100vw-24px),370px)] overflow-hidden rounded-[16px] shadow-pop ring-[0.5px] ring-[var(--separator)]"
        >
          <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-3.5">
            <p className="text-[17px] font-semibold text-ink">{t.header.notifications}</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="rounded-full px-2 py-1 text-[15px] text-primary-text hover:bg-fill"
              >
                {t.header.markAllRead}
              </button>
            )}
          </div>
          {warnings.length === 0 ? (
            <div className="px-5 pb-6 pt-3 text-center">
              <p className="font-semibold text-ink">{t.header.noNotificationsTitle}</p>
              <p className="mt-1 text-[14px] text-muted">{t.header.noNotificationsText}</p>
            </div>
          ) : (
            <ul className="max-h-[min(60vh,420px)] overflow-y-auto px-2 pb-2">
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
                      className="flex w-full items-start gap-3 rounded-[12px] px-2.5 py-2.5 text-left transition-colors hover:bg-fill"
                    >
                      <span
                        className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ${
                          severe ? 'bg-danger text-white' : warning.level === 'warn90' ? 'bg-serious text-white' : 'bg-warn text-black/75'
                        }`}
                      >
                        <Icon className="size-4" aria-hidden="true" strokeWidth={2.4} />
                      </span>
                      <span className="min-w-0 flex-1 text-[14px] leading-snug text-ink">{message(warning)}</span>
                      {isUnread && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="shadow-[inset_0_0.5px_0_var(--separator)]">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenBudget();
              }}
              className="w-full px-4 py-3 text-[15px] text-primary-text hover:bg-fill"
            >
              {t.header.goToBudget}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
