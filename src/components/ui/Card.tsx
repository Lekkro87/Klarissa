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
        <h2 id={id} className="font-display text-[16px] font-semibold tracking-[-0.015em] text-ink">
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

interface PageIntroProps {
  title: ReactNode;
  subtitle: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
}

/** Kopfbereich einer Seite: großer Titel (h1), Untertitel und Hauptaktionen. */
export function PageIntro({ title, subtitle, eyebrow, actions }: PageIntroProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1
          id="page-title"
          tabIndex={-1}
          className="font-display text-[26px] font-semibold leading-tight tracking-[-0.035em] text-ink outline-none sm:text-[32px]"
        >
          {title}
        </h1>
        <p className="mt-1.5 text-[15px] text-muted">{subtitle}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
