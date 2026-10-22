import React from 'react';
import { motion } from 'framer-motion';
import {
  Coins,
  CircleDollarSign,
  CalendarClock,
  Building2,
  Cpu,
  Layers,
  AlertTriangle,
} from 'lucide-react';
import StatsCard from '../components/charts/StatsCard';
import AnalyticsChart from '../components/charts/AnalyticsChart';
import {
  useAiTokenUsage,
  useAiUsageIntegrity,
  useAiUsageModule,
} from '../hooks/useAiTokenUsage';
import ModuleBreakdown from '../components/ai-usage/ModuleBreakdown';
import LedgerCoverage from '../components/ai-usage/LedgerCoverage';
import ModuleDrilldown from '../components/ai-usage/ModuleDrilldown';
import { formatNumber, cn } from '../utils/helpers';

/**
 * The window options, each carrying the query param it sends.
 *
 * A month is the wrong unit for watching a bill. By the time a monthly bar moves you have
 * already spent the money, and "is today unusual?" has no answer at all. Days and weeks are
 * what you reach for when a number looks wrong; months are for the trend.
 */
type WindowUnit = 'days' | 'weeks' | 'months';
interface WindowOption {
  label: string;
  unit: WindowUnit;
  value: number;
}

const WINDOW_OPTIONS: WindowOption[] = [
  { label: 'Today', unit: 'days', value: 1 },
  { label: 'Last 3 days', unit: 'days', value: 3 },
  { label: 'Last 7 days', unit: 'days', value: 7 },
  { label: 'Last 15 days', unit: 'days', value: 15 },
  { label: 'Last 30 days', unit: 'days', value: 30 },
  { label: 'Last 4 weeks', unit: 'weeks', value: 4 },
  { label: 'Last 8 weeks', unit: 'weeks', value: 8 },
  { label: 'Last 12 weeks', unit: 'weeks', value: 12 },
  { label: 'Last 3 months', unit: 'months', value: 3 },
  { label: 'Last 6 months', unit: 'months', value: 6 },
  { label: 'Last 12 months', unit: 'months', value: 12 },
  { label: 'Last 24 months', unit: 'months', value: 24 },
];

const WINDOW_GROUPS: { label: string; unit: WindowUnit }[] = [
  { label: 'By day', unit: 'days' },
  { label: 'By week', unit: 'weeks' },
  { label: 'By month', unit: 'months' },
];

/** `days=7` etc. — the key the option carries, so adding a unit needs no change here. */
const windowKey = (o: WindowOption): string => `${o.unit}:${o.value}`;

/** USD formatter — costs are in dollars; the shared formatCurrency helper is INR. */
const usd = (n: number): string => {
  const v = Number(n || 0);
  // Show more precision for tiny sub-cent figures so cheap calls are still legible.
  const decimals = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
  return `$${v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

const prettyMonth = (ym: string): string => {
  const [y, m] = (ym || '').split('-');
  if (!y || !m) return ym;
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
};

/**
 * Label one bucket. The backend sends `YYYY-MM` for months and an ISO date for days and weeks,
 * so the granularity decides how to read it rather than guessing from the string.
 */
const prettyBucket = (bucket: string, granularity: string): string => {
  if (granularity === 'month') return prettyMonth(bucket);
  const d = new Date(`${bucket}T00:00:00`);
  if (Number.isNaN(d.getTime())) return bucket;
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  // A week bucket is its Monday; say so, or "Oct 12" reads as a single day.
  return granularity === 'week' ? `w/c ${label}` : label;
};

/** "day" -> "per day", for the chart titles. */
const perUnit = (granularity: string): string =>
  granularity === 'day' ? 'per day' : granularity === 'week' ? 'per week' : 'per month';

const prettyFeature = (f: string): string =>
  (f || 'other')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const selectClass =
  'rounded-lg border border-themed bg-line/[0.03] px-3 py-2 text-sm text-text ' +
  'focus:border-brand-cyan/50 focus:outline-none';

interface TokenUsageProps {
  embedded?: boolean;
  /** A range chosen for the whole module. It overrides the day/week/month preset, which is
   *  disabled rather than hidden so the active control is obvious. */
  range?: { start: string; end: string } | null;
}

const AiTokenUsage: React.FC<TokenUsageProps> = ({ embedded, range }) => {
  const [window_, setWindow] = React.useState<WindowOption>(
    WINDOW_OPTIONS.find((o) => o.unit === 'months' && o.value === 12) as WindowOption
  );
  const [clientId, setClientId] = React.useState<number | ''>('');
  const [model, setModel] = React.useState('');
  const [feature, setFeature] = React.useState('');
  const [moduleKey, setModuleKey] = React.useState('');
  /** Which module's drill-down panel is open. Independent of the filter above: you can read
   *  one module in depth without narrowing every other chart on the page. */
  const [openModule, setOpenModule] = React.useState<string | null>(null);

  const params = React.useMemo(
    () => ({
      ...(range ? { start: range.start, end: range.end } : { [window_.unit]: window_.value }),
      ...(clientId !== '' ? { client_id: clientId } : {}),
      ...(model ? { model } : {}),
      ...(feature ? { feature } : {}),
      ...(moduleKey ? { module: moduleKey } : {}),
    }),
    [window_, clientId, model, feature, moduleKey]
  );

  const { data, isLoading, error, isFetching } = useAiTokenUsage(params);
  const integrity = useAiUsageIntegrity();

  // `series` is the granularity-neutral list; `monthly` is the legacy key and carries the same
  // data, so an older backend still renders rather than showing an empty chart.
  const granularity = data?.granularity ?? 'month';
  const series = (data?.series ?? data?.monthly ?? []).map((b) => ({
    ...b,
    bucket: (b as { bucket?: string }).bucket ?? (b as { year_month: string }).year_month,
  }));
  const totals = data?.totals;
  const current = data?.current_month;

  return (
    <div className="space-y-8">
      {/* Hero */}
      {!embedded && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-themed surface-card p-7"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-cyan/10 blur-3xl"
          />
          <p className="kicker mb-2 flex items-center gap-2 text-brand-cyan">
            <Coins className="h-3.5 w-3.5" /> AI Spend · Cross-tenant
          </p>
          <h1 className="serif-display text-[32px] font-medium leading-tight text-text">
            AI Token Usage &amp; Cost
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-dim">
            Every AI call across the platform — content generation, in-session tutoring,
            assessments &amp; feedback, the code mentor, the video companion, mock interviews,
            the support bot, TTS and images — metered per client, model, surface and month.
          </p>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={windowKey(window_)}
          disabled={Boolean(range)}
          title={range ? 'A date range is set for the whole module' : undefined}
          onChange={(e) => {
            const next = WINDOW_OPTIONS.find((o) => windowKey(o) === e.target.value);
            if (next) setWindow(next);
          }}
        >
          {WINDOW_GROUPS.map((g) => (
            <optgroup key={g.unit} label={g.label}>
              {WINDOW_OPTIONS.filter((o) => o.unit === g.unit).map((o) => (
                <option key={windowKey(o)} value={windowKey(o)}>
                  {o.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        <select
          className={selectClass}
          value={clientId}
          onChange={(e) => setClientId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">All clients</option>
          {(data?.available_clients ?? []).map((c) => (
            <option key={String(c.client_id)} value={c.client_id ?? ''}>
              {c.client_name}
            </option>
          ))}
        </select>

        <select className={selectClass} value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="">All models</option>
          {(data?.available_models ?? []).map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        {/* Module first, surfaces nested inside it. The flat list this replaces was 25 rows
            of raw `feature` strings — the shape of the ledger, not of the product. A value of
            `m:<key>` selects a whole module; a bare value selects one surface. */}
        <select
          className={selectClass}
          value={moduleKey ? `m:${moduleKey}` : feature}
          onChange={(e) => {
            const v = e.target.value;
            if (v.startsWith('m:')) {
              setModuleKey(v.slice(2));
              setFeature('');
            } else {
              setModuleKey('');
              setFeature(v);
            }
          }}
        >
          <option value="">All modules &amp; surfaces</option>
          {(data?.available_modules ?? []).map((m) => (
            <optgroup key={m.module} label={m.module_label}>
              <option value={`m:${m.module}`}>All of {m.module_label}</option>
              {m.surfaces.map((sf) => (
                <option key={sf.feature} value={sf.feature}>
                  {'\u00a0\u00a0'}
                  {sf.surface_label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {isFetching && (
          <span className="flex items-center gap-2 text-xs text-text-mute">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
            Updating…
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-500/5 p-4 text-sm text-danger-500">
          <AlertTriangle className="h-4 w-4" />
          Couldn’t load AI usage. Confirm you’re signed in as a super-admin and the backend is reachable.
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
          <span className="ml-3 text-text-dim">Loading AI usage…</span>
        </div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard
              title={`Total cost · ${window_.label.toLowerCase()}`}
              value={usd(totals?.cost_usd ?? 0)}
              icon={CircleDollarSign}
              color="accent"
            />
            <StatsCard
              title={`Total tokens · ${window_.label.toLowerCase()}`}
              value={totals?.total_tokens ?? 0}
              icon={Coins}
              color="secondary"
            />
            <StatsCard
              title={
                granularity === 'month'
                  ? `This month · ${current ? prettyMonth(current.year_month) : ''}`
                  : granularity === 'week'
                    ? 'This week'
                    : 'Today'
              }
              value={usd(current?.cost_usd ?? 0)}
              icon={CalendarClock}
              color="primary"
            />
            <StatsCard
              title="Clients with spend"
              value={totals?.clients ?? 0}
              icon={Building2}
              color="primary"
            />
          </div>

          {/* The headline figure's error bar, next to the headline figure. */}
          <LedgerCoverage query={integrity} />

          {/* Monthly charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AnalyticsChart
              title={`Tokens ${perUnit(granularity)}`}
              kicker="Consumption"
              type="bar"
              data={series.map((m) => ({ ...m, label: prettyBucket(m.bucket, granularity) }))}
              dataKey="total_tokens"
              xAxisKey="label"
              color="#00e0ff"
            />
            <AnalyticsChart
              title={`Cost ${perUnit(granularity)} (USD)`}
              kicker="Spend"
              type="area"
              data={series.map((m) => ({ ...m, label: prettyBucket(m.bucket, granularity) }))}
              dataKey="cost_usd"
              xAxisKey="label"
              color="#ffc66d"
            />
          </div>

          {/* Breakdown tables */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BreakdownTable
              title="By client"
              icon={<Building2 className="h-3.5 w-3.5" />}
              rows={(data?.by_client ?? []).map((r) => ({
                key: String(r.client_id ?? 'platform'),
                label: r.client_name,
                tokens: r.total_tokens,
                cost: r.cost_usd,
                events: r.events,
              }))}
            />
            <BreakdownTable
              title="By model"
              icon={<Cpu className="h-3.5 w-3.5" />}
              rows={(data?.by_model ?? []).map((r) => ({
                key: r.model,
                label: r.model,
                tokens: r.total_tokens,
                cost: r.cost_usd,
                events: r.events,
              }))}
            />
            <MonthlyTable
              rows={[...series].reverse()}
              granularity={granularity}
            />
          </div>

          {/* Where the money actually goes, by product module. */}
          <ModuleBreakdown
            modules={data?.by_module ?? []}
            openModule={openModule}
            onToggle={(key) => setOpenModule((cur) => (cur === key ? null : key))}
            renderDetail={(key) => (
              <ModuleDrilldown
                moduleKey={key}
                windowUnit={window_.unit}
                windowValue={window_.value}
                clientId={clientId === '' ? undefined : clientId}
              />
            )}
          />
        </>
      )}
    </div>
  );
};

interface BreakdownRow {
  key: string;
  label: string;
  tokens: number;
  cost: number;
  events: number;
}

const BreakdownTable: React.FC<{
  title: string;
  icon: React.ReactNode;
  rows: BreakdownRow[];
}> = ({ title, icon, rows }) => (
  <div className="overflow-hidden rounded-xl border border-themed surface-card">
    <div className="flex items-center gap-2 border-b border-themed px-5 py-3.5">
      <span className="text-brand-cyan">{icon}</span>
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest2 text-text-dim">
        {title}
      </h3>
    </div>
    <div className="max-h-[360px] overflow-y-auto">
      <table className="min-w-full">
        <thead className="sticky top-0 bg-line/[0.03] backdrop-blur">
          <tr className="text-left">
            <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              {title.replace('By ', '')}
            </th>
            <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              Tokens
            </th>
            <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              Cost
            </th>
            <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              Calls
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-6 text-center text-sm text-text-mute">
                No usage in this window.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr
                key={r.key}
                className="border-t border-themed/60 transition-colors hover:bg-line/[0.03]"
              >
                <td className="max-w-[220px] truncate px-5 py-3 text-sm text-text">{r.label}</td>
                <td className="px-5 py-3 text-right font-mono text-sm text-text-dim">
                  {formatNumber(r.tokens)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm text-brand-gold">
                  {usd(r.cost)}
                </td>
                <td className="px-5 py-3 text-right font-mono text-sm text-text-mute">
                  {formatNumber(r.events)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const MonthlyTable: React.FC<{
  rows: { bucket: string; total_tokens: number; cost_usd: number; events: number }[];
  granularity: string;
}> = ({ rows, granularity }) => (
  <div className="overflow-hidden rounded-xl border border-themed surface-card">
    <div className="flex items-center gap-2 border-b border-themed px-5 py-3.5">
      <span className="text-brand-cyan">
        <CalendarClock className="h-3.5 w-3.5" />
      </span>
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest2 text-text-dim">
        {granularity === 'day' ? 'Daily' : granularity === 'week' ? 'Weekly' : 'Monthly'} ledger
      </h3>
    </div>
    <div className="max-h-[360px] overflow-y-auto">
      <table className="min-w-full">
        <thead className="sticky top-0 bg-line/[0.03] backdrop-blur">
          <tr className="text-left">
            <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              {granularity === 'day' ? 'Day' : granularity === 'week' ? 'Week' : 'Month'}
            </th>
            <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              Tokens
            </th>
            <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              Cost
            </th>
            <th className="px-5 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              Calls
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.bucket}
              className="border-t border-themed/60 transition-colors hover:bg-line/[0.03]"
            >
              <td className={cn('px-5 py-3 text-sm text-text')}>
                {prettyBucket(r.bucket, granularity)}
              </td>
              <td className="px-5 py-3 text-right font-mono text-sm text-text-dim">
                {formatNumber(r.total_tokens)}
              </td>
              <td className="px-5 py-3 text-right font-mono text-sm text-brand-gold">
                {usd(r.cost_usd)}
              </td>
              <td className="px-5 py-3 text-right font-mono text-sm text-text-mute">
                {formatNumber(r.events)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default AiTokenUsage;
