import type { LucideIcon } from 'lucide-react';
import type { ComponentPropsWithRef, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft';
type Size = 'sm' | 'md';

/* Button-Stile nach Apple-Vorbild: gefüllt, grau, schlicht, getönt */
const VARIANTS: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary: 'bg-fill text-primary-text hover:bg-fill-strong active:scale-[0.98]',
  ghost: 'text-primary-text hover:bg-fill active:opacity-70',
  danger: 'bg-danger text-white hover:brightness-110 active:scale-[0.98]',
  soft: 'bg-primary-soft text-primary-text hover:brightness-[0.97] active:scale-[0.98]',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3.5 text-[13px]',
  md: 'h-11 gap-2 px-5 text-[15px]',
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
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-semibold tracking-[-0.01em] transition-[background-color,color,transform,opacity,filter] duration-150 disabled:pointer-events-none disabled:opacity-40 ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {Icon && <Icon className={`shrink-0 ${size === 'sm' ? 'size-4' : 'size-[18px]'}`} aria-hidden="true" strokeWidth={2.2} />}
      {children !== undefined && children !== null && children !== false && <span className="min-w-0 truncate">{children}</span>}
      {IconRight && <IconRight className="size-4 shrink-0" aria-hidden="true" strokeWidth={2.2} />}
    </button>
  );
}

export interface IconButtonProps extends ComponentPropsWithRef<'button'> {
  icon: LucideIcon;
  /** Zugänglicher Name – wird auch als Tooltip angezeigt */
  label: string;
  tone?: 'default' | 'danger' | 'primary';
  size?: 'sm' | 'md';
  /** `outline`: runder, grau gefüllter Button (iOS-Stil) */
  variant?: 'ghost' | 'outline';
}

const ICON_TONES = {
  default: 'text-muted hover:text-ink',
  danger: 'text-muted hover:text-danger-ink',
  primary: 'text-primary-text',
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
      className={`relative inline-grid shrink-0 place-items-center rounded-full transition-[background-color,color,opacity] duration-150 active:opacity-60 disabled:pointer-events-none disabled:opacity-30 ${size === 'sm' ? 'size-8' : 'size-10'} ${
        variant === 'outline' ? 'bg-fill hover:bg-fill-strong' : 'hover:bg-fill'
      } ${ICON_TONES[tone]} ${className}`}
      {...rest}
    >
      <Icon className={size === 'sm' ? 'size-[17px]' : 'size-5'} aria-hidden="true" strokeWidth={2} />
    </button>
  );
}
