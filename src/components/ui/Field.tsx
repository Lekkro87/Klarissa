import { CircleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { useI18n } from '../../state/store';

interface FieldProps {
  id: string;
  label: string;
  error?: string | null;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

/** Beschriftetes Formularfeld mit Hinweis- und Fehlertext. */
export function Field({ id, label, error, hint, optional = false, children, className = '' }: FieldProps) {
  const { t } = useI18n();
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="pl-1 text-[13px] font-medium text-muted">
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted/80">({t.common.optional})</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 pl-1 text-[13px] font-medium text-danger-ink">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="pl-1 text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Hilfsfunktion: ARIA-Attribute für ein Eingabefeld mit optionalem Fehler/Hinweis. */
export function fieldAria(id: string, error?: string | null, hasHint = false) {
  return {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${id}-error` : hasHint ? `${id}-hint` : undefined,
  } as const;
}
