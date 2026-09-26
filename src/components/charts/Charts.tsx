import { ChartNoAxesColumn } from 'lucide-react';
import { useId, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useI18n } from '../../state/store';
import { EmptyState } from '../ui/EmptyState';

/* ------------------------------------------------------------------ */
/* Tooltip                                                             */
/* ------------------------------------------------------------------ */

interface TooltipEntry {
  name?: unknown;
  value?: unknown;
  color?: string;
  fill?: string;
  stroke?: string;
  dataKey?: unknown;
  payload?: unknown;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipEntry>;
  title?: string;
  rows?: { label: string; value: string; color?: string; strong?: boolean }[];
}

export function ChartTooltipBox({ title, rows }: { title?: string; rows: NonNullable<ChartTooltipProps['rows']> }) {
  return (
    <div className="min-w-44 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm shadow-pop">
      {title && <p className="mb-1.5 font-semibold text-ink">{title}</p>}
      <ul className="space-y-1">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-ink-2">
              {row.color && <span className="size-2.5 rounded-[3px]" style={{ background: row.color }} aria-hidden="true" />}
              {row.label}
            </span>
            <span className={`num ${row.strong ? 'font-bold' : 'font-semibold'} text-ink`}>{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const axisTick = { fill: 'var(--axis)', fontSize: 12 };

/* ------------------------------------------------------------------ */
/* Einnahmen vs. Ausgaben (Balken)                                     */
/* ------------------------------------------------------------------ */

export interface IncomeExpenseDatum {
  label: string;
  fullLabel: string;
  income: number;
  expense: number;
}

export function IncomeExpenseChart({ data, height = 280 }: { data: IncomeExpenseDatum[]; height?: number }) {
  const { t, f } = useI18n();
  const hasData = data.some((point) => point.income > 0 || point.expense > 0);
  if (!hasData) return <EmptyState compact icon={ChartNoAxesColumn} title={t.statistics.noExpenses} />;

  const summary = data
    .map((point) => `${point.fullLabel}: ${t.common.income} ${f.money(point.income)}, ${t.common.expenses} ${f.money(point.expense)}`)
    .join('; ');

  return (
    <div role="img" aria-label={`${t.dashboard.incomeVsExpenses}. ${summary}`}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barGap={3} barCategoryGap="26%" margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: 'var(--line-strong)' }} tick={axisTick} tickMargin={10} />
          <YAxis tickFormatter={f.axisMoney} tickLine={false} axisLine={false} tick={axisTick} width={72} />
          <Tooltip
            cursor={{ fill: 'var(--surface-3)', opacity: 0.6, radius: 8 } as object}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as IncomeExpenseDatum;
              return (
                <ChartTooltipBox
                  title={point.fullLabel}
                  rows={[
                    { label: t.common.income, value: f.money(point.income), color: 'var(--income)' },
                    { label: t.common.expenses, value: f.money(point.expense), color: 'var(--expense)' },
                    { label: t.common.net, value: f.money(point.income - point.expense), strong: true },
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="income" name={t.common.income} fill="var(--income)" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={600} />
          <Bar dataKey="expense" name={t.common.expenses} fill="var(--expense)" radius={[4, 4, 0, 0]} maxBarSize={24} animationDuration={600} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Verlauf einer Reihe (Fläche)                                        */
/* ------------------------------------------------------------------ */

export interface TrendDatum {
  label: string;
  fullLabel: string;
  value: number;
}

interface TrendChartProps {
  data: TrendDatum[];
  color: string;
  name: string;
  height?: number;
  emptyText: string;
  allowZeroOnly?: boolean;
}

export function TrendChart({ data, color, name, height = 240, emptyText, allowZeroOnly = false }: TrendChartProps) {
  const { f } = useI18n();
  const gradientId = useId().replace(/:/g, '');
  const hasData = allowZeroOnly ? data.length > 0 : data.some((point) => point.value !== 0);
  if (!hasData) return <EmptyState compact icon={ChartNoAxesColumn} title={emptyText} />;

  const summary = data.map((point) => `${point.fullLabel}: ${f.money(point.value)}`).join('; ');
  const dense = data.length > 14;

  return (
    <div role="img" aria-label={`${name}. ${summary}`}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--line-strong)' }}
            tick={axisTick}
            tickMargin={10}
            interval={dense ? 'preserveStartEnd' : 0}
            minTickGap={dense ? 18 : 4}
          />
          <YAxis tickFormatter={f.axisMoney} tickLine={false} axisLine={false} tick={axisTick} width={72} />
          <Tooltip
            cursor={{ stroke: 'var(--line-strong)', strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const point = payload[0].payload as TrendDatum;
              return <ChartTooltipBox title={point.fullLabel} rows={[{ label: name, value: f.money(point.value), color }]} />;
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 5, strokeWidth: 2, stroke: 'var(--surface)', fill: color }}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Donut: Anteile nach Kategorie                                       */
/* ------------------------------------------------------------------ */

export interface DonutItem {
  key: string;
  label: string;
  amount: number;
  share: number;
  color: string;
}

interface CategoryDonutProps {
  items: DonutItem[];
  total: number;
  title: string;
  emptyText: string;
  compact?: boolean;
}

export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
];

/** Fasst kleine Kategorien zu „Weitere“ zusammen (max. 6 Farben + Grau). */
export function toDonutItems(
  entries: { category: string; amount: number; share: number }[],
  label: (category: string) => string,
  otherLabel: string,
): DonutItem[] {
  const max = CHART_COLORS.length;
  const head = entries.length > max + 1 ? entries.slice(0, max) : entries.slice(0, max + 1);
  const rest = entries.slice(head.length);
  const items: DonutItem[] = head.map((entry, index) => ({
    key: entry.category,
    label: label(entry.category),
    amount: entry.amount,
    share: entry.share,
    color: CHART_COLORS[index] ?? 'var(--chart-other)',
  }));
  if (rest.length > 0) {
    items.push({
      key: '__other',
      label: otherLabel,
      amount: rest.reduce((sum, entry) => sum + entry.amount, 0),
      share: rest.reduce((sum, entry) => sum + entry.share, 0),
      color: 'var(--chart-other)',
    });
  }
  return items;
}

export function CategoryDonut({ items, total, title, emptyText, compact = false }: CategoryDonutProps) {
  const { t, f } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  if (items.length === 0 || total <= 0) return <EmptyState compact icon={ChartNoAxesColumn} title={emptyText} />;

  const size = compact ? 184 : 200;
  const activeItem = active !== null ? items[active] : null;
  const summary = items.map((item) => `${item.label} ${f.percent(item.share)}`).join(', ');

  return (
    <div className="@container">
    <div className="flex flex-col items-center gap-6 @[34rem]:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${title}: ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={items}
              dataKey="amount"
              nameKey="label"
              innerRadius="66%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              cornerRadius={4}
              stroke="var(--surface)"
              strokeWidth={2}
              onMouseEnter={(_, index) => setActive(index)}
              onMouseLeave={() => setActive(null)}
              animationDuration={700}
            >
              {items.map((item, index) => (
                <Cell
                  key={item.key}
                  fill={item.color}
                  opacity={active === null || active === index ? 1 : 0.35}
                  style={{ transition: 'opacity 150ms ease', outline: 'none' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="max-w-[64%] text-center">
            <p className="truncate text-xs font-medium text-muted">{activeItem ? activeItem.label : t.common.total}</p>
            <p className="num font-display text-[15px] font-semibold leading-tight text-ink sm:text-base">
              {f.money(activeItem ? activeItem.amount : total)}
            </p>
            {activeItem && <p className="num text-xs font-semibold text-muted">{f.percent(activeItem.share)}</p>}
          </div>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1">
        {items.map((item, index) => (
          <li key={item.key}>
            <div
              className={`flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors ${active === index ? 'bg-surface-2' : ''}`}
              onMouseEnter={() => setActive(index)}
              onMouseLeave={() => setActive(null)}
            >
              <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: item.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{item.label}</span>
              <span className="num text-sm font-semibold text-ink">{f.money(item.amount)}</span>
              <span className="num w-14 text-right text-[13px] text-muted">{f.percent(item.share)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
    </div>
  );
}
