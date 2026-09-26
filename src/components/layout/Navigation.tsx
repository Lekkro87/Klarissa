import {
  ArrowLeftRight,
  ChartColumn,
  Coins,
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

const MAIN_ITEMS: { route: Route; icon: LucideIcon }[] = [
  { route: 'dashboard', icon: LayoutDashboard },
  { route: 'transactions', icon: ArrowLeftRight },
  { route: 'budget', icon: Wallet },
  { route: 'statistics', icon: ChartColumn },
  { route: 'goals', icon: PiggyBank },
  { route: 'cash', icon: Coins },
];

const ACCOUNT_ITEMS: { route: Route; icon: LucideIcon }[] = [{ route: 'settings', icon: Settings }];

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
      className={`grid shrink-0 place-items-center rounded-full bg-[conic-gradient(from_210deg,var(--primary),#38bdf8,var(--primary))] p-[2px] ${
        size === 'sm' ? 'size-9' : 'size-11'
      }`}
    >
      <span
        className={`grid size-full place-items-center rounded-full bg-surface font-display font-semibold text-primary-text ${
          size === 'sm' ? 'text-[11px]' : 'text-sm'
        }`}
      >
        {initialsOf(name)}
      </span>
    </span>
  );
}

export function LogoMark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <span
      className={`btn-primary grid shrink-0 place-items-center ${size === 'sm' ? 'size-8 rounded-[10px]' : 'size-10 rounded-[13px]'}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className={size === 'sm' ? 'size-5' : 'size-6'} fill="none">
        <path
          d="M11 8v16M11 16.5 20 8M14.2 13.6 21 24"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function Logo() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      <div className="leading-tight">
        <p className="font-display text-[17px] font-semibold tracking-[-0.03em] text-ink">{t.app.name}</p>
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

function NavLink({
  item,
  active,
  onNavigate,
  badge,
}: {
  item: { route: Route; icon: LucideIcon };
  active: boolean;
  onNavigate: (route: Route) => void;
  badge?: number;
}) {
  const { t } = useI18n();
  const Icon = item.icon;
  return (
    <li>
      <a
        href={`#${item.route}`}
        aria-current={active ? 'page' : undefined}
        onClick={(event) => {
          event.preventDefault();
          onNavigate(item.route);
        }}
        className={`group flex h-11 items-center gap-3 rounded-[14px] px-1.5 text-[15px] transition-colors duration-150 ${
          active
            ? 'bg-surface-2 font-semibold text-ink ring-1 ring-line'
            : 'font-medium text-ink-2 hover:bg-surface-2 hover:text-ink'
        }`}
      >
        <span
          className={`grid size-8 shrink-0 place-items-center rounded-[10px] transition-colors ${
            active ? 'btn-primary' : 'text-muted group-hover:text-ink'
          }`}
        >
          <Icon className="size-[18px]" aria-hidden="true" strokeWidth={active ? 2.2 : 1.9} />
        </span>
        <span className="flex-1">{t.nav[item.route]}</span>
        {badge !== undefined && badge > 0 && (
          <span className="num mr-1 grid h-5 min-w-5 place-items-center rounded-full bg-serious-soft px-1.5 text-xs font-bold text-serious-ink">
            <span aria-hidden="true">{badge}</span>
            <span className="sr-only">
              {t.budget.warningsTitle}: {badge}
            </span>
          </span>
        )}
      </a>
    </li>
  );
}

function NavContent({ route, onNavigate, onAddTransaction, warningCount }: NavContentProps) {
  const { t } = useI18n();
  const { settings } = useData();
  return (
    <>
      <Button icon={Plus} block onClick={onAddTransaction} className="text-[14px]">
        {t.actions.addTransaction}
      </Button>
      <nav aria-label={t.nav.main} className="mt-6 flex-1 overflow-y-auto">
        <p className="eyebrow mb-2 px-2 text-[11px]">{t.nav.groupMenu}</p>
        <ul className="flex flex-col gap-1">
          {MAIN_ITEMS.map((item) => (
            <NavLink
              key={item.route}
              item={item}
              active={item.route === route}
              onNavigate={onNavigate}
              badge={item.route === 'budget' ? warningCount : undefined}
            />
          ))}
        </ul>
        <p className="eyebrow mb-2 mt-6 px-2 text-[11px]">{t.nav.groupAccount}</p>
        <ul className="flex flex-col gap-1">
          {ACCOUNT_ITEMS.map((item) => (
            <NavLink key={item.route} item={item} active={item.route === route} onNavigate={onNavigate} />
          ))}
        </ul>
      </nav>
      <a
        href="#settings"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('settings');
        }}
        className="mt-4 flex items-center gap-3 rounded-[18px] border border-line bg-surface-2 p-2.5 transition-colors hover:bg-surface-3"
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

/** Schwebende Seitenleiste für Desktop (ab 1024 px). */
export function Sidebar(props: NavContentProps) {
  return (
    <aside className="fixed bottom-3 left-3 top-3 z-40 hidden w-[256px] flex-col rounded-[26px] border border-line bg-surface px-3.5 pb-3.5 pt-5 shadow-card lg:flex">
      <div className="mb-6 px-1.5">
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
      <div className="animate-fade absolute inset-0 bg-[var(--backdrop)] backdrop-blur-[2px]" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.main}
        className="animate-drawer absolute bottom-2 left-2 top-2 flex w-[min(84vw,310px)] flex-col rounded-[26px] border border-line bg-surface px-3.5 pb-[calc(env(safe-area-inset-bottom,0px)+14px)] pt-[calc(env(safe-area-inset-top,0px)+18px)] shadow-pop"
      >
        <div className="mb-6 flex items-center justify-between pl-1.5">
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

interface MobileTabBarProps {
  route: Route;
  onNavigate: (route: Route) => void;
  onAddTransaction: () => void;
}

/** Untere Navigationsleiste auf Smartphones und Tablets mit zentralem Plus-Button. */
export function MobileTabBar({ route, onNavigate, onAddTransaction }: MobileTabBarProps) {
  const { t } = useI18n();
  const tabs: ({ route: Route; icon: LucideIcon; label: string } | 'add')[] = [
    { route: 'dashboard', icon: LayoutDashboard, label: t.tabs.dashboard },
    { route: 'transactions', icon: ArrowLeftRight, label: t.tabs.transactions },
    'add',
    { route: 'budget', icon: Wallet, label: t.tabs.budget },
    { route: 'statistics', icon: ChartColumn, label: t.tabs.statistics },
  ];
  return (
    <nav
      aria-label={t.nav.quick}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-glass pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto grid h-[66px] max-w-lg grid-cols-5 items-center px-1">
        {tabs.map((tab) => {
          if (tab === 'add') {
            return (
              <li key="add" className="flex justify-center">
                <button
                  type="button"
                  onClick={onAddTransaction}
                  aria-label={t.actions.addTransaction}
                  title={t.actions.addTransaction}
                  className="btn-primary -mt-8 grid size-[58px] place-items-center rounded-full ring-[5px] ring-[var(--canvas)]"
                >
                  <Plus className="size-6" aria-hidden="true" strokeWidth={2.5} />
                </button>
              </li>
            );
          }
          const Icon = tab.icon;
          const active = tab.route === route;
          return (
            <li key={tab.route} className="flex justify-center">
              <a
                href={`#${tab.route}`}
                aria-current={active ? 'page' : undefined}
                aria-label={t.nav[tab.route]}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(tab.route);
                }}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-semibold transition-colors ${
                  active ? 'text-primary-text' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon className="size-[22px]" aria-hidden="true" strokeWidth={active ? 2.3 : 1.9} />
                <span className="max-w-full truncate" aria-hidden="true">
                  {tab.label}
                </span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
