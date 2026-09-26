import type { ComponentPropsWithoutRef, ReactNode } from 'react';

interface CardProps extends ComponentPropsWithoutRef<'section'> {
  padded?: boolean;
  interactive?: boolean;
}

export function Card({ padded = true, interactive = false, className = '', children, ...rest }: CardProps) {
  return (
    <section
      className={`card min-w-0 ${padded ? 'p-5 sm:p-6' : ''} ${interactive ? 'transition-shadow duration-200 hover:shadow-hover' : ''} ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  id?: string;
  className?: string;
}

export function CardHeader({ title, subtitle, actions, id, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3 ${className}`}>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-base font-semibold tracking-[-0.01em] text-ink">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface PageIntroProps {
  title?: ReactNode;
  subtitle: ReactNode;
  actions?: ReactNode;
}

/** Einleitung einer Seite mit Untertitel und Hauptaktionen. */
export function PageIntro({ title, subtitle, actions }: PageIntroProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {title && (
          <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-[28px]">{title}</p>
        )}
        <p className={title ? 'mt-1 text-muted' : 'text-muted'}>{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
