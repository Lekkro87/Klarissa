import type { LucideIcon } from 'lucide-react';
import type { ComponentPropsWithRef, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md';

const VARIANTS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary:
    'border border-line bg-surface text-ink shadow-[0_1px_2px_rgb(18_19_26/0.05)] hover:border-line-strong hover:bg-surface-2 active:translate-y-px',
  ghost: 'text-ink-2 hover:bg-surface-3 hover:text-ink',
  danger: 'bg-danger text-white shadow-sm hover:brightness-110 active:translate-y-px',
  soft: 'bg-primary-soft text-primary-text hover:bg-[color-mix(in_srgb,var(--primary)_18%,var(--surface))]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-9 gap-1.5 rounded-[11px] px-3 text-sm',
  md: 'h-11 gap-2 rounded-[14px] px-4.5 text-[15px]',
};

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  block?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  block,
  className = '',
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap font-semibold transition-[background-color,border-color,color,transform,filter] duration-150 disabled:pointer-events-none disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={`shrink-0 ${size === 'sm' ? 'size-4' : 'size-[18px]'}`} aria-hidden="true" strokeWidth={2.2} />}
      {children !== undefined && children !== null && children !== false && <span className="min-w-0 truncate">{children}</span>}
      {IconRight && <IconRight className="size-4" aria-hidden="true" />}
    </button>
  );
}

export interface IconButtonProps extends ComponentPropsWithRef<'button'> {
  icon: LucideIcon;
  /** Zugänglicher Name – wird auch als Tooltip angezeigt */
  label: string;
  tone?: 'default' | 'danger' | 'primary';
  size?: 'sm' | 'md';
  /** `outline`: runder Button mit Rahmen (z. B. im Header) */
  variant?: 'ghost' | 'outline';
}

const ICON_TONES = {
  default: 'text-muted hover:bg-surface-3 hover:text-ink',
  danger: 'text-muted hover:bg-danger-soft hover:text-danger-ink',
  primary: 'text-muted hover:bg-primary-soft hover:text-primary-text',
};

export function IconButton({
  icon: Icon,
  label,
  tone = 'default',
  size = 'md',
  variant = 'ghost',
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`relative inline-grid shrink-0 place-items-center transition-colors duration-150 disabled:opacity-40 ${size === 'sm' ? 'size-9' : 'size-10'} ${
        variant === 'outline' ? 'rounded-full border border-line bg-surface shadow-[0_1px_2px_rgb(18_19_26/0.05)]' : 'rounded-xl'
      } ${ICON_TONES[tone]} ${className}`}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'size-[17px]' : 'size-5'} aria-hidden="true" />
    </button>
  );
}
