import React from 'react';
import { motion } from 'framer-motion';
import { Flame, CalendarDays, Building2, Coins } from 'lucide-react';

import StatsCard from '../components/charts/StatsCard';
import AnalyticsChart from '../components/charts/AnalyticsChart';
import { CostHeatmap } from '../components/ai-usage/CostHeatmap';
import SurfaceBreakdown from '../components/ai-usage/SurfaceBreakdown';
import { useAiCostDaily } from '../hooks/useAiCostDaily';
import { cn } from '../utils/helpers';

/**
 * Daily AI spend across every tenant, in one place.
 *
 * The AI Token Usage page answers "how much, by month, in total"; the per-client insights panel
 * answers "how much, by day, for this one tenant". Neither answers "which tenant, on which day",
 * so comparing the fleet meant opening each client in turn. This is that view.
 *
 * Both numbers come from the same ledger and MUST agree with the per-client page -
 * `ai_usage.tests_daily_matrix` pins a client's row against `client_insights.cost_series`, since
 * two surfaces counting one thing drift unless something stops them.
 */

const WINDOWS = [
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 180 days', value: 180 },
];

/** Costs are USD. The shared formatCurrency helper is hard-coded to INR - never use it here. */
const usd = (n: number): string => {
  const v = Number(n || 0);
  const decimals = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

const selectClass =
  'rounded-lg border border-themed bg-line/[0.03] px-3 py-2 text-sm text-text ' +
  'focus:border-brand-cyan/50 focus:outline-none';

interface CostDailyProps {
  embedded?: boolean;
  /** A range chosen for the whole module. When set it wins over the local preset, and the
   *  preset is disabled rather than hidden, so it is obvious which control is in force. */
  range?: { start: string; end: string } | null;
}

const AiCostDaily: React.FC<CostDailyProps> = ({ embedded, range }) => {
  const [days, setDays] = React.useState<number>(30);
  const [feature, setFeature] = React.useState<string>('');
  const [model, setModel] = React.useState<string>('');

  const params = React.useMemo(
    () => ({
      ...(range ? { start: range.start, end: range.end } : { days }),
      ...(feature ? { feature } : {}),
      ...(model ? { model } : {}),
    }),
    [days, feature, model, range],
  );
  const { data, isLoading, error, isFetching } = useAiCostDaily(params);

  const totals = data?.totals;
  const series = (data?.daily_totals ?? []).map((d) => ({
    bucket: d.date,
    cost_usd: d.cost_usd,
    events: d.events,
  }));

  return (
    <div className="space-y-8">
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
            <Flame className="h-3.5 w-3.5" /> Daily AI Cost · Every tenant
          </p>
          <h1 className="serif-display text-[32px] font-medium leading-tight text-text">
            Daily Cost by Client
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-text-dim">
            Which tenant spent what, on which day. The heatmap below is one row per client and one
            cell per day, so a spike belongs to somebody without opening their page.
          </p>
        </motion.div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Window"
          disabled={Boolean(range)}
          title={range ? 'A date range is set for the whole module' : undefined}
        >
          {WINDOWS.map((w) => (
            <option key={w.value} value={w.value}>{w.label}</option>
          ))}
        </select>
        <select
          className={selectClass}
          value={feature}
          onChange={(e) => setFeature(e.target.value)}
          aria-label="Surface"
        >
          <option value="">All surfaces</option>
          {(data?.available_features ?? []).map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
        <select
          className={selectClass}
          value={model}
          onChange={(e) => setModel(e.target.value)}
          aria-label="Model"
        >
          <option value="">All models</option>
          {(data?.available_models ?? []).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        {isFetching && !isLoading && (
          <span className="text-xs text-text-dim">updating…</span>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          Could not load daily AI cost.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <StatsCard title="Spend in window" value={usd(totals?.cost_usd ?? 0)} icon={Coins} color="secondary" />
            <StatsCard title="Tenants with spend" value={totals?.clients ?? 0} icon={Building2} color="primary" />
            <StatsCard
              title="Busiest day"
              value={totals?.busiest_day ? usd(totals.busiest_day.cost_usd) : '-'}
              suffix={totals?.busiest_day ? ` · ${totals.busiest_day.date}` : undefined}
              icon={CalendarDays}
              color="accent"
            />
            <StatsCard title="Hottest single cell" value={usd(totals?.peak_cell_usd ?? 0)} icon={Flame} color="danger" />
          </div>

          <div
            data-testid="ai-cost-heatmap"
            className="rounded-2xl border border-themed surface-card p-6"
          >
            <p className="kicker mb-1 text-brand-cyan">Spend heatmap</p>
            <h2 className="mb-1 text-lg font-medium text-text">
              {data.window.start} → {data.window.end}
            </h2>
            <p className="mb-5 text-xs text-text-dim">
              One row per tenant, one cell per day. Colour is that day&apos;s spend on a square-root
              scale, because a linear one paints everything but the two biggest days the same.
              Hover a cell for its exact numbers.
            </p>
            <CostHeatmap
              dates={data.dates}
              clients={data.clients}
              peak={totals?.peak_cell_usd ?? 0}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <AnalyticsChart
              title="Spend per day"
              kicker="All tenants"
              data={series}
              type="area"
              dataKey="cost_usd"
              xAxisKey="bucket"
              height={260}
            />
            <AnalyticsChart
              title="Calls per day"
              kicker="All tenants"
              data={series}
              type="bar"
              dataKey="events"
              xAxisKey="bucket"
              height={260}
            />
          </div>

          <div className="rounded-2xl border border-themed surface-card p-6">
            <p className="kicker mb-1 text-brand-cyan">Per tenant</p>
            <h2 className="mb-4 text-lg font-medium text-text">Who spent what</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-themed text-left text-xs uppercase tracking-wide text-text-dim">
                    <th className="pb-2 pr-4 font-medium">Tenant</th>
                    <th className="pb-2 pr-4 text-right font-medium">Spend</th>
                    <th className="pb-2 pr-4 text-right font-medium">Tokens</th>
                    <th className="pb-2 pr-4 text-right font-medium">Calls</th>
                    <th className="pb-2 pr-4 text-right font-medium">Active days</th>
                    <th className="pb-2 pr-4 text-right font-medium">Avg / active day</th>
                    <th className="pb-2 text-right font-medium">Peak day</th>
                  </tr>
                </thead>
                <tbody>
                  {data.clients.map((c) => (
                    <tr key={String(c.client_id)} className="border-b border-themed/50 last:border-0">
                      <td className={cn('py-2 pr-4', c.is_platform ? 'italic text-text-dim' : 'text-text')}>
                        {c.client_name}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-text">{usd(c.total_cost_usd)}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{c.total_tokens.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{c.total_events.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-text-dim">
                        {c.active_days}/{data.window.days}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{usd(c.avg_cost_per_active_day)}</td>
                      <td className="py-2 text-right tabular-nums text-text-dim">
                        {usd(c.peak.cost_usd)} <span className="text-text-dim/70">· {c.peak.date}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-text-dim">
              Platform / internal is real spend with no tenant behind it - course builds, sweeps,
              briefings. It is in the total and is deliberately not counted as a tenant.
            </p>
          </div>

          <SurfaceBreakdown surfaces={data.by_surface ?? []} />
        </>
      ) : null}
    </div>
  );
};

export default AiCostDaily;
