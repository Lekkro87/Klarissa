import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
  compact?: boolean;
}

/** Leerer Zustand wie ContentUnavailableView in iOS. */
export function EmptyState({ icon: Icon, title, text, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <Icon className={`text-muted/70 ${compact ? 'mb-3 size-10' : 'mb-4 size-14'}`} aria-hidden="true" strokeWidth={1.5} />
      <p className={`font-semibold tracking-[-0.02em] text-ink ${compact ? 'text-[17px]' : 'text-[22px]'}`}>{title}</p>
      {text && <p className="mt-1.5 max-w-sm text-[15px] text-muted">{text}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
