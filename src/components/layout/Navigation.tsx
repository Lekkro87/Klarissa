import {
  ArrowLeftRight,
  ChartColumn,
  LayoutDashboard,
  type LucideIcon,
  PiggyBank,
  Plus,
  Settings,
  Wallet,
  X,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Route } from '../../hooks/useHashRoute';
import { useData, useI18n } from '../../state/store';
import { Button, IconButton } from '../ui/Button';

export const NAV_ITEMS: { route: Route; icon: LucideIcon }[] = [
  { route: 'dashboard', icon: LayoutDashboard },
  { route: 'transactions', icon: ArrowLeftRight },
  { route: 'budget', icon: Wallet },
  { route: 'statistics', icon: ChartColumn },
  { route: 'goals', icon: PiggyBank },
  { route: 'settings', icon: Settings },
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-primary-soft font-display font-semibold text-primary-text ring-1 ring-inset ring-[color-mix(in_srgb,var(--primary)_20%,transparent)] ${
        size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm'
      }`}
    >
      {initialsOf(name)}
    </span>
  );
}

export function Logo() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-fg shadow-sm" aria-hidden="true">
        <svg viewBox="0 0 32 32" className="size-6" fill="none">
          <path
            d="M11 8v16M11 16.5 20 8M14.2 13.6 21 24"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div className="leading-tight">
        <p className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">{t.app.name}</p>
        <p className="text-xs text-muted">{t.app.tagline}</p>
      </div>
    </div>
  );
}

interface NavContentProps {
  route: Route;
  onNavigate: (route: Route) => void;
  onAddTransaction: () => void;
  warningCount: number;
}

function NavContent({ route, onNavigate, onAddTransaction, warningCount }: NavContentProps) {
  const { t } = useI18n();
  const { settings } = useData();
  return (
    <>
      <Button icon={Plus} block onClick={onAddTransaction} className="text-[14px]">
        {t.actions.addTransaction}
      </Button>
      <nav aria-label={t.nav.main} className="mt-6 flex-1">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ route: item, icon: Icon }) => {
            const active = item === route;
            return (
              <li key={item}>
                <a
                  href={`#${item}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    onNavigate(item);
                  }}
                  className={`group flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-150 ${
                    active ? 'bg-primary-soft text-primary-text' : 'text-ink-2 hover:bg-surface-3 hover:text-ink'
                  }`}
                >
                  <Icon
                    className={`size-5 shrink-0 ${active ? '' : 'text-muted group-hover:text-ink'}`}
                    aria-hidden="true"
                    strokeWidth={active ? 2.2 : 1.9}
                  />
                  <span className="flex-1">{t.nav[item]}</span>
                  {item === 'budget' && warningCount > 0 && (
                    <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-serious-soft px-1.5 text-xs font-bold text-serious-ink">
                      <span aria-hidden="true">{warningCount}</span>
                      <span className="sr-only">{t.budget.warningsTitle}: {warningCount}</span>
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <a
        href="#settings"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('settings');
        }}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface-2 p-3 transition-colors hover:bg-surface-3"
        aria-label={t.header.profile}
      >
        <Avatar name={settings.name} />
        <div className="min-w-0 leading-tight">
          <p className="truncate font-semibold text-ink">{settings.name}</p>
          <p className="truncate text-[13px] text-muted">{t.app.accountType}</p>
        </div>
      </a>
    </>
  );
}

/** Feste Seitenleiste für Desktop (ab 1024 px). */
export function Sidebar(props: NavContentProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col border-r border-line bg-surface px-4 pb-5 pt-6 lg:flex">
      <div className="mb-7 px-2">
        <Logo />
      </div>
      <NavContent {...props} />
    </aside>
  );
}

interface MobileDrawerProps extends NavContentProps {
  open: boolean;
  onClose: () => void;
}

/** Ausklappbares Menü für Smartphones und Tablets. */
export function MobileDrawer({ open, onClose, ...props }: MobileDrawerProps) {
  const { t } = useI18n();
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
      if (event.key === 'Tab' && panel) {
        const focusable = Array.from(panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    const onResize = () => {
      if (window.innerWidth >= 1024) onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      document.body.style.overflow = '';
      previouslyFocused?.focus({ preventScroll: true });
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="animate-fade absolute inset-0 bg-[var(--backdrop)]" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.main}
        className="animate-drawer absolute inset-y-0 left-0 flex w-[min(86vw,320px)] flex-col border-r border-line bg-surface px-4 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-[calc(env(safe-area-inset-top,0px)+20px)] shadow-pop"
      >
        <div className="mb-6 flex items-center justify-between px-2">
          <Logo />
          <IconButton icon={X} label={t.nav.closeMenu} onClick={onClose} />
        </div>
        <NavContent
          {...props}
          onNavigate={(route) => {
            props.onNavigate(route);
            onClose();
          }}
          onAddTransaction={() => {
            onClose();
            props.onAddTransaction();
          }}
        />
      </div>
    </div>
  );
}
