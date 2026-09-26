import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text?: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ icon: Icon, title, text, action, compact = false }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? 'px-4 py-8' : 'px-6 py-14'}`}>
      <span
        className={`grid place-items-center rounded-2xl bg-primary-soft text-primary-text ${compact ? 'mb-3 size-12' : 'mb-4 size-14'}`}
      >
        <Icon className={compact ? 'size-6' : 'size-7'} aria-hidden="true" strokeWidth={1.8} />
      </span>
      <p className={`font-display font-semibold text-ink ${compact ? 'text-[15px]' : 'text-lg'}`}>{title}</p>
      {text && <p className="mt-1.5 max-w-sm text-sm text-muted">{text}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}
