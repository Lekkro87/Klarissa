import {
  ArrowLeftRight,
  ChartColumn,
  ChevronRight,
  Coins,
  Ellipsis,
  LayoutDashboard,
  type LucideIcon,
  PiggyBank,
  Plus,
  Settings,
  Wallet,
} from 'lucide-react';
import { useRef } from 'react';
import type { Route } from '../../hooks/useHashRoute';
import { useData, useI18n } from '../../state/store';
import { Button } from '../ui/Button';
import { useDialogBehavior } from '../ui/Modal';

const MAIN_ITEMS: { route: Route; icon: LucideIcon; tint: string }[] = [
  { route: 'dashboard', icon: LayoutDashboard, tint: '#007aff' },
  { route: 'transactions', icon: ArrowLeftRight, tint: '#5856d6' },
  { route: 'budget', icon: Wallet, tint: '#ff9500' },
  { route: 'statistics', icon: ChartColumn, tint: '#ff2d55' },
  { route: 'goals', icon: PiggyBank, tint: '#af52de' },
  { route: 'cash', icon: Coins, tint: '#34c759' },
];

const ACCOUNT_ITEMS: { route: Route; icon: LucideIcon; tint: string }[] = [
  { route: 'settings', icon: Settings, tint: '#8e8e93' },
];

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Monogramm wie in der Kontakte-App. */
export function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'size-8 text-[13px]', md: 'size-10 text-[15px]', lg: 'size-16 text-[24px]' };
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-[linear-gradient(180deg,#a8adb8_0%,#858a96_100%)] font-semibold tracking-[0.02em] text-white ${sizes[size]}`}
    >
      {initialsOf(name)}
    </span>
  );
}

/** App-Symbol als abgerundetes Quadrat. */
export function LogoMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'size-8 rounded-[8px]', md: 'size-9 rounded-[9px]', lg: 'size-20 rounded-[20px]' };
  const glyph = { sm: 'size-5', md: 'size-[22px]', lg: 'size-12' };
  return (
    <span
      className={`grid shrink-0 place-items-center bg-[linear-gradient(180deg,#2b95ff_0%,#0066e0_100%)] text-white shadow-[inset_0_0.5px_0_rgb(255_255_255/0.35),0_1px_2px_rgb(0_0_0/0.15)] ${sizes[size]}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className={glyph[size]} fill="none">
        <path d="M11 8v16M11 16.5 20 8M14.2 13.6 21 24" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export function Logo() {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      <p className="text-[17px] font-semibold tracking-[-0.022em] text-ink">{t.app.name}</p>
    </div>
  );
}

interface NavContentProps {
  route: Route;
  onNavigate: (route: Route) => void;
  onAddTransaction: () => void;
  warningCount: number;
}

function SidebarLink({
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
        className={`flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-[15px] transition-colors duration-100 ${
          active ? 'bg-primary font-medium text-white' : 'text-ink hover:bg-fill'
        }`}
      >
        <Icon className={`size-[18px] shrink-0 ${active ? 'text-white' : 'text-primary-text'}`} aria-hidden="true" strokeWidth={2} />
        <span className="flex-1 truncate">{t.nav[item.route]}</span>
        {badge !== undefined && badge > 0 && (
          <span
            className={`num grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[12px] font-semibold ${
              active ? 'bg-white/25 text-white' : 'bg-fill text-muted'
            }`}
          >
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

/** Seitenleiste im Stil von macOS/iPadOS (ab 1024 px). */
export function Sidebar({ route, onNavigate, onAddTransaction, warningCount }: NavContentProps) {
  const { t } = useI18n();
  const { settings } = useData();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] flex-col bg-[var(--glass-sidebar)] px-3 pb-3 pt-5 shadow-[inset_-0.5px_0_0_var(--separator)] backdrop-blur-2xl lg:flex">
      <div className="mb-5 px-2">
        <Logo />
      </div>
      <Button icon={Plus} block size="sm" onClick={onAddTransaction} className="h-9 text-[14px]">
        {t.actions.addTransaction}
      </Button>
      <nav aria-label={t.nav.main} className="mt-5 flex-1 overflow-y-auto">
        <p className="mb-1 px-2.5 text-[12px] font-semibold text-muted">{t.nav.groupMenu}</p>
        <ul className="flex flex-col gap-0.5">
          {MAIN_ITEMS.map((item) => (
            <SidebarLink
              key={item.route}
              item={item}
              active={item.route === route}
              onNavigate={onNavigate}
              badge={item.route === 'budget' ? warningCount : undefined}
            />
          ))}
        </ul>
        <p className="mb-1 mt-5 px-2.5 text-[12px] font-semibold text-muted">{t.nav.groupAccount}</p>
        <ul className="flex flex-col gap-0.5">
          {ACCOUNT_ITEMS.map((item) => (
            <SidebarLink key={item.route} item={item} active={item.route === route} onNavigate={onNavigate} />
          ))}
        </ul>
      </nav>
      <a
        href="#settings"
        onClick={(event) => {
          event.preventDefault();
          onNavigate('settings');
        }}
        className="mt-3 flex items-center gap-3 rounded-[10px] p-2 transition-colors hover:bg-fill"
        aria-label={t.header.profile}
      >
        <Avatar name={settings.name} />
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[15px] font-semibold text-ink">{settings.name}</p>
          <p className="truncate text-[13px] text-muted">{t.app.accountType}</p>
        </div>
      </a>
    </aside>
  );
}

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  route: Route;
  onNavigate: (route: Route) => void;
  warningCount: number;
}

/** „Mehr“-Sheet mit allen Bereichen (Smartphone/Tablet), wie eine iOS-Liste. */
export function MoreSheet({ open, onClose, route, onNavigate, warningCount }: MoreSheetProps) {
  const { t } = useI18n();
  const { settings } = useData();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogBehavior(open, panelRef, onClose);
  if (!open) return null;

  const go = (next: Route) => {
    onNavigate(next);
    onClose();
  };

  const row = (item: { route: Route; icon: LucideIcon; tint: string }) => {
    const Icon = item.icon;
    const active = item.route === route;
    return (
      <li key={item.route}>
        <a
          href={`#${item.route}`}
          aria-current={active ? 'page' : undefined}
          onClick={(event) => {
            event.preventDefault();
            go(item.route);
          }}
          className="flex min-h-12 items-center gap-3 px-4 transition-colors hover:bg-fill active:bg-fill-strong"
        >
          <span className="grid size-[29px] shrink-0 place-items-center rounded-[7px] text-white" style={{ background: item.tint }} aria-hidden="true">
            <Icon className="size-[18px]" strokeWidth={2.2} />
          </span>
          <span className={`flex-1 text-[17px] ${active ? 'font-semibold text-primary-text' : 'text-ink'}`}>{t.nav[item.route]}</span>
          {item.route === 'budget' && warningCount > 0 && (
            <span className="num rounded-full bg-danger px-2 text-[13px] font-semibold leading-5 text-white">{warningCount}</span>
          )}
          <ChevronRight className="size-4 text-muted/60" aria-hidden="true" strokeWidth={2.5} />
        </a>
      </li>
    );
  };

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="animate-fade absolute inset-0 bg-[var(--backdrop)]" aria-hidden="true" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.nav.main}
        tabIndex={-1}
        className="animate-sheet absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[16px] bg-canvas pb-[calc(env(safe-area-inset-bottom,0px)+20px)] outline-none"
      >
        <div className="mx-auto mt-1.5 h-[5px] w-9 rounded-full bg-fill-strong" aria-hidden="true" />
        <div className="flex items-center justify-between px-4 pb-3 pt-2">
          <p className="text-[17px] font-semibold text-ink">{t.nav.more}</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1.5 text-[17px] font-semibold text-primary-text hover:bg-fill"
          >
            {t.common.done}
          </button>
        </div>
        <div className="space-y-6 px-4">
          <div className="group-list">
            <a
              href="#settings"
              onClick={(event) => {
                event.preventDefault();
                go('settings');
              }}
              className="flex items-center gap-3 p-3 transition-colors hover:bg-fill active:bg-fill-strong"
              aria-label={t.header.profile}
            >
              <Avatar name={settings.name} size="md" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[17px] font-semibold text-ink">{settings.name}</p>
                <p className="truncate text-[13px] text-muted">{t.app.accountType}</p>
              </div>
              <ChevronRight className="size-4 text-muted/60" aria-hidden="true" strokeWidth={2.5} />
            </a>
          </div>
          <nav aria-label={t.nav.main}>
            <ul className="group-list [--row-inset:58px]">{MAIN_ITEMS.map(row)}</ul>
            <ul className="group-list mt-6 [--row-inset:58px]">{ACCOUNT_ITEMS.map(row)}</ul>
          </nav>
        </div>
      </div>
    </div>
  );
}

interface MobileTabBarProps {
  route: Route;
  onNavigate: (route: Route) => void;
  onOpenMore: () => void;
  moreOpen: boolean;
}

/** Schwebende Tab-Leiste aus Glas (iOS) für Smartphone und Tablet. */
export function MobileTabBar({ route, onNavigate, onOpenMore, moreOpen }: MobileTabBarProps) {
  const { t } = useI18n();
  const tabs: { route: Route; icon: LucideIcon; label: string }[] = [
    { route: 'dashboard', icon: LayoutDashboard, label: t.tabs.dashboard },
    { route: 'transactions', icon: ArrowLeftRight, label: t.tabs.transactions },
    { route: 'budget', icon: Wallet, label: t.tabs.budget },
    { route: 'statistics', icon: ChartColumn, label: t.tabs.statistics },
  ];
  const inMore = !tabs.some((tab) => tab.route === route);
  const itemClass = (active: boolean) =>
    `flex h-full min-w-0 flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium transition-colors ${
      active ? 'bg-fill text-primary-text' : 'text-ink-2 hover:text-ink'
    }`;
  return (
    <nav
      aria-label={t.nav.quick}
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom,0px)+10px)] lg:hidden"
    >
      <ul className="material mx-auto grid h-[62px] max-w-md grid-cols-5 gap-0.5 rounded-full p-1 shadow-[0_8px_30px_-8px_rgb(0_0_0/0.25),inset_0_0.5px_0_rgb(255_255_255/0.4)] ring-[0.5px] ring-[var(--separator)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.route === route;
          return (
            <li key={tab.route} className="min-w-0">
              <a
                href={`#${tab.route}`}
                aria-current={active ? 'page' : undefined}
                aria-label={t.nav[tab.route]}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(tab.route);
                }}
                className={itemClass(active)}
              >
                <Icon className="size-[22px]" aria-hidden="true" strokeWidth={active ? 2.3 : 1.9} />
                <span className="max-w-full truncate px-1" aria-hidden="true">
                  {tab.label}
                </span>
              </a>
            </li>
          );
        })}
        <li className="min-w-0">
          <button
            type="button"
            onClick={onOpenMore}
            aria-expanded={moreOpen}
            aria-label={t.nav.more}
            className={`w-full ${itemClass(inMore)}`}
          >
            <Ellipsis className="size-[22px]" aria-hidden="true" strokeWidth={inMore ? 2.3 : 1.9} />
            <span className="max-w-full truncate px-1" aria-hidden="true">
              {t.nav.more}
            </span>
          </button>
        </li>
      </ul>
    </nav>
  );
}
