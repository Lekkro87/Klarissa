import { type PointerEvent, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';

interface SparklineProps {
  values: number[];
  labels: string[];
  color: string;
  format: (value: number) => string;
  label: string;
  /** Höhe in Pixeln oder `fill`, um den Elterncontainer auszufüllen */
  height?: number | 'fill';
  /** Helle Darstellung für dunkle Flächen (z. B. Kontostand-Karte) */
  inverse?: boolean;
}

const WIDTH = 100;

/** Weich geglätteter Pfad durch alle Punkte (Catmull-Rom → Bézier, ohne Überschwingen an den Enden). */
function smoothPath(points: [number, number][]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0][0]},${points[0][1]}`;
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]}`;
  }
  return d;
}

/** Kleine Verlaufskurve mit Hover-Anzeige – ohne Achsen, für Kennzahlen-Karten. */
export function Sparkline({ values, labels, color, format, label, height: heightProp = 56, inverse = false }: SparklineProps) {
  const gradientId = useId().replace(/:/g, '');
  const [hover, setHover] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(80);
  const fill = heightProp === 'fill';
  const height = fill ? measured : heightProp;

  useLayoutEffect(() => {
    if (!fill || !wrapperRef.current) return;
    const element = wrapperRef.current;
    const update = () => setMeasured(Math.max(48, Math.round(element.clientHeight)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [fill]);

  const geometry = useMemo(() => {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || Math.abs(max) || 1;
    const pad = span * 0.18;
    const low = min - pad;
    const high = max + pad;
    const points = values.map<[number, number]>((value, index) => [
      values.length === 1 ? WIDTH / 2 : (index / (values.length - 1)) * WIDTH,
      max === min ? height / 2 : height - ((value - low) / (high - low)) * height,
    ]);
    const line = smoothPath(points);
    const area = points.length > 1 ? `${line} L${WIDTH},${height} L0,${height} Z` : '';
    return { points, line, area };
  }, [values, height]);

  if (values.length === 0) return null;

  const active = hover ?? values.length - 1;
  const [x, y] = geometry.points[active];
  const summary = values.map((value, index) => `${labels[index]}: ${format(value)}`).join(', ');

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * (values.length - 1)));
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full select-none ${fill ? 'h-full' : ''}`}
      style={fill ? undefined : { height }}
      role="img"
      aria-label={`${label}: ${summary}`}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${WIDTH} ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={inverse ? 0.35 : 0.22} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {geometry.area && <path d={geometry.area} fill={`url(#${gradientId})`} />}
        <path
          d={geometry.line}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {hover !== null && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px"
          style={{ left: `${x}%`, background: inverse ? 'rgb(255 255 255 / 0.3)' : 'var(--line-strong)' }}
        />
      )}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[left,top] duration-150"
        style={{
          left: `${x}%`,
          top: y,
          background: color,
          boxShadow: `0 0 0 2px ${inverse ? 'var(--hero-from)' : 'var(--surface)'}`,
        }}
      />
      {hover !== null && (
        <span
          aria-hidden="true"
          className={`num pointer-events-none absolute -top-2 z-10 -translate-y-full whitespace-nowrap rounded-lg px-2 py-1 text-[11px] font-semibold shadow-pop ${
            inverse ? 'bg-white text-[#12131a]' : 'border border-line bg-surface text-ink'
          }`}
          style={{ left: `clamp(0px, calc(${x}% - 48px), calc(100% - 96px))` }}
        >
          {labels[hover]} · {format(values[hover])}
        </span>
      )}
    </div>
  );
}
