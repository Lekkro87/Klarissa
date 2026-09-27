import type { ReactNode } from 'react';

interface RingProgressProps {
  percent: number;
  color: string;
  size?: number;
  thickness?: number;
  label: string;
  valueText?: string;
  children?: ReactNode;
}

/** Ring im Stil der Aktivitätsringe (z. B. für das Monatsbudget). */
export function RingProgress({ percent, color, size = 176, thickness = 20, label, valueText, children }: RingProgressProps) {
  const safe = Number.isFinite(percent) ? Math.max(0, percent) : 0;
  const clamped = Math.min(100, safe);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (clamped / 100) * circumference;
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped)}
      aria-valuetext={valueText}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`color-mix(in srgb, ${color} 20%, transparent)`}
          strokeWidth={thickness}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
