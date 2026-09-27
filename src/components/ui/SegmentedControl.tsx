import type { LucideIcon } from 'lucide-react';
import { type KeyboardEvent, useId, useRef } from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
  /** Auf kleinen Bildschirmen als natives Auswahlfeld darstellen */
  mobileSelect?: boolean;
}

/** Segmentsteuerung im iOS-Stil – barrierefrei als Radiogruppe (Pfeiltasten). */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'sm',
  fullWidth = false,
  className = '',
  mobileSelect = false,
}: SegmentedControlProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selectId = useId();

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    if (next === -1) return;
    event.preventDefault();
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  const display = mobileSelect
    ? fullWidth
      ? 'hidden sm:flex sm:w-full'
      : 'hidden sm:inline-flex'
    : fullWidth
      ? 'flex w-full'
      : 'inline-flex';

  const group = (
    <div
      role="radiogroup"
      aria-label={label}
      className={`max-w-full rounded-[10px] bg-fill p-[2px] ${display} ${className}`}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(element) => {
              refs.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`inline-flex min-w-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] transition-all duration-200 ${
              size === 'sm' ? 'h-7 px-3 text-[13px]' : 'h-8 px-4 text-[14px]'
            } ${fullWidth ? 'flex-1' : ''} ${
              selected ? 'bg-seg-thumb font-semibold text-ink shadow-thumb' : 'font-medium text-ink-2 hover:text-ink'
            }`}
          >
            {Icon && <Icon className="size-4 shrink-0" aria-hidden="true" />}
            <span className="truncate">{option.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (!mobileSelect) return group;
  return (
    <>
      <label htmlFor={selectId} className="sr-only">
        {label}
      </label>
      <select
        id={selectId}
        className="control sm:hidden"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {group}
    </>
  );
}
