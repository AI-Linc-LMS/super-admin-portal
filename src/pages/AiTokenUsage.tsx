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
import { useAiTokenUsage } from '../hooks/useAiTokenUsage';
import { formatNumber, cn } from '../utils/helpers';

const MONTH_OPTIONS = [
  { label: 'Last 3 months', value: 3 },
  { label: 'Last 6 months', value: 6 },
  { label: 'Last 12 months', value: 12 },
  { label: 'Last 24 months', value: 24 },
];

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

const prettyFeature = (f: string): string =>
  (f || 'other')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

const selectClass =
  'rounded-lg border border-themed bg-line/[0.03] px-3 py-2 text-sm text-text ' +
  'focus:border-brand-cyan/50 focus:outline-none';

const AiTokenUsage: React.FC = () => {
  const [months, setMonths] = React.useState(12);
  const [clientId, setClientId] = React.useState<number | ''>('');
  const [model, setModel] = React.useState('');
  const [feature, setFeature] = React.useState('');

  const params = React.useMemo(
    () => ({
      months,
      ...(clientId !== '' ? { client_id: clientId } : {}),
      ...(model ? { model } : {}),
      ...(feature ? { feature } : {}),
    }),
    [months, clientId, model, feature]
  );

  const { data, isLoading, error, isFetching } = useAiTokenUsage(params);

  const monthly = data?.monthly ?? [];
  const totals = data?.totals;
  const current = data?.current_month;

  return (
    <div className="space-y-8">
      {/* Hero */}
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

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
        >
          {MONTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
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

        <select className={selectClass} value={feature} onChange={(e) => setFeature(e.target.value)}>
          <option value="">All surfaces</option>
          {(data?.available_features ?? []).map((f) => (
            <option key={f} value={f}>
              {prettyFeature(f)}
            </option>
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
              title="Total cost (window)"
              value={usd(totals?.cost_usd ?? 0)}
              icon={CircleDollarSign}
              color="accent"
            />
            <StatsCard
              title="Total tokens (window)"
              value={totals?.total_tokens ?? 0}
              icon={Coins}
              color="secondary"
            />
            <StatsCard
              title={`This month · ${current ? prettyMonth(current.year_month) : ''}`}
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

          {/* Monthly charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AnalyticsChart
              title="Tokens per month"
              kicker="Consumption"
              type="bar"
              data={monthly.map((m) => ({ ...m, label: prettyMonth(m.year_month) }))}
              dataKey="total_tokens"
              xAxisKey="label"
              color="#00e0ff"
            />
            <AnalyticsChart
              title="Cost per month (USD)"
              kicker="Spend"
              type="area"
              data={monthly.map((m) => ({ ...m, label: prettyMonth(m.year_month) }))}
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
            <BreakdownTable
              title="By surface / feature"
              icon={<Layers className="h-3.5 w-3.5" />}
              rows={(data?.by_feature ?? []).map((r) => ({
                key: r.feature,
                label: prettyFeature(r.feature),
                tokens: r.total_tokens,
                cost: r.cost_usd,
                events: r.events,
              }))}
            />
            <MonthlyTable
              rows={[...monthly].reverse()}
            />
          </div>
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
  rows: { year_month: string; total_tokens: number; cost_usd: number; events: number }[];
}> = ({ rows }) => (
  <div className="overflow-hidden rounded-xl border border-themed surface-card">
    <div className="flex items-center gap-2 border-b border-themed px-5 py-3.5">
      <span className="text-brand-cyan">
        <CalendarClock className="h-3.5 w-3.5" />
      </span>
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-widest2 text-text-dim">
        Monthly ledger
      </h3>
    </div>
    <div className="max-h-[360px] overflow-y-auto">
      <table className="min-w-full">
        <thead className="sticky top-0 bg-line/[0.03] backdrop-blur">
          <tr className="text-left">
            <th className="px-5 py-2.5 text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
              Month
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
              key={r.year_month}
              className="border-t border-themed/60 transition-colors hover:bg-line/[0.03]"
            >
              <td className={cn('px-5 py-3 text-sm text-text')}>{prettyMonth(r.year_month)}</td>
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
