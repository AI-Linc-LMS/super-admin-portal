import React from 'react';
import { motion } from 'framer-motion';
import { Flame, CalendarDays, Building2, Coins, Users, UserCog } from 'lucide-react';

import StatsCard from '../components/charts/StatsCard';
import AnalyticsChart from '../components/charts/AnalyticsChart';
import { CostHeatmap } from '../components/ai-usage/CostHeatmap';
import { PeopleCalendar, PeopleMode } from '../components/ai-usage/PeopleCalendar';
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

const AiCostDaily: React.FC = () => {
  const [days, setDays] = React.useState<number>(30);
  const [feature, setFeature] = React.useState<string>('');
  const [model, setModel] = React.useState<string>('');
  const [peopleMode, setPeopleMode] = React.useState<PeopleMode>('users');
  const [pickedDay, setPickedDay] = React.useState<string | null>(null);

  const params = React.useMemo(
    () => ({ days, ...(feature ? { feature } : {}), ...(model ? { model } : {}) }),
    [days, feature, model],
  );
  const { data, isLoading, error, isFetching } = useAiCostDaily(params);

  const totals = data?.totals;
  const people = data?.people;
  const staffAi = data?.staff_ai;
  const peopleSeries = people?.series ?? [];
  const pickedCost = React.useMemo(
    () => (pickedDay ? data?.daily_totals.find((d) => d.date === pickedDay) ?? null : null),
    [pickedDay, data],
  );
  const pickedPeople = React.useMemo(
    () => (pickedDay ? peopleSeries.find((d) => d.date === pickedDay) ?? null : null),
    [pickedDay, peopleSeries],
  );
  const series = (data?.daily_totals ?? []).map((d) => ({
    bucket: d.date,
    cost_usd: d.cost_usd,
    events: d.events,
  }));

  return (
    <div className="space-y-8">
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

      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Window"
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
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="kicker mb-1 text-brand-cyan">Who was here</p>
                <h2 className="text-lg font-medium text-text">People on the platform, by day</h2>
                <p className="mt-1 max-w-2xl text-xs text-text-dim">
                  Distinct people with tracked time that day, students and staff counted
                  separately. This is <strong>not</strong> a login count: nothing records a
                  login, so a sign-in that left no activity is not here. It also does not
                  respond to the surface and model filters above, because being on the platform
                  is not an AI call.
                </p>
              </div>
              <div className="flex rounded-lg border border-themed p-0.5" role="group" aria-label="Population">
                {([
                  { key: 'users' as PeopleMode, label: 'Students', icon: Users },
                  { key: 'staff' as PeopleMode, label: 'Staff', icon: UserCog },
                ]).map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPeopleMode(key)}
                    aria-pressed={peopleMode === key}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
                      peopleMode === key
                        ? 'bg-brand-cyan/15 text-brand-cyan'
                        : 'text-text-dim hover:text-text',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <StatsCard
                title="Students in window"
                value={people?.distinct_total ?? 0}
                suffix=" distinct"
                icon={Users}
                color="primary"
              />
              <StatsCard
                title="Staff in window"
                value={people?.staff_distinct_total ?? 0}
                suffix=" distinct"
                icon={UserCog}
                color="secondary"
              />
              <StatsCard
                title="Busiest day"
                value={people?.peak_day?.users ?? 0}
                suffix={people?.peak_day ? ` · ${people.peak_day.date}` : undefined}
                icon={CalendarDays}
                color="accent"
              />
              <StatsCard
                title="Staff AI spend"
                value={usd(staffAi?.cost_usd ?? 0)}
                suffix={staffAi?.events ? ` · ${staffAi.events.toLocaleString()} calls` : undefined}
                icon={Coins}
                color="danger"
              />
            </div>

            <AnalyticsChart
              title={peopleMode === 'staff' ? 'Active staff per day' : 'Active students per day'}
              kicker="All tenants"
              data={peopleSeries.map((d) => ({ bucket: d.date, users: d.users, staff: d.staff }))}
              type="area"
              dataKey={peopleMode}
              xAxisKey="bucket"
              height={260}
            />

            <div className="mt-8">
              <p className="kicker mb-1 text-brand-cyan">Calendar</p>
              <h3 className="mb-1 text-base font-medium text-text">
                {peopleMode === 'staff' ? 'Staff' : 'Students'} by date
              </h3>
              <p className="mb-4 text-xs text-text-dim">
                The same numbers on real month grids, so a quiet Saturday reads as a weekend
                rather than as a dip. Click a day to pin it; hover for the full breakdown.
              </p>
              <PeopleCalendar
                days={peopleSeries}
                mode={peopleMode}
                selected={pickedDay}
                onSelect={setPickedDay}
              />
              {pickedPeople && (
                <div className="mt-5 rounded-xl border border-brand-cyan/30 bg-brand-cyan/5 p-4">
                  <p className="text-sm font-medium text-text">{pickedPeople.date}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-5">
                    <p className="text-text-dim">
                      Students <span className="tabular-nums text-text">{pickedPeople.users}</span>
                    </p>
                    <p className="text-text-dim">
                      Staff <span className="tabular-nums text-text">{pickedPeople.staff}</span>
                    </p>
                    <p className="text-text-dim">
                      Student minutes{' '}
                      <span className="tabular-nums text-text">
                        {pickedPeople.minutes.toLocaleString()}
                      </span>
                    </p>
                    <p className="text-text-dim">
                      Staff minutes{' '}
                      <span className="tabular-nums text-text">
                        {pickedPeople.staff_minutes.toLocaleString()}
                      </span>
                    </p>
                    <p className="text-text-dim">
                      AI spend{' '}
                      <span className="tabular-nums text-text">
                        {pickedCost ? usd(pickedCost.cost_usd) : '-'}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {staffAi && staffAi.people.length > 0 && (
            <div className="rounded-2xl border border-themed surface-card p-6">
              <p className="kicker mb-1 text-brand-cyan">Staff AI usage</p>
              <h2 className="mb-1 text-lg font-medium text-text">Staff spending on AI</h2>
              <p className="mb-4 max-w-3xl text-xs text-text-dim">
                Spend attributed to an admin, instructor or course manager rather than a learner:
                course builds, sweeps, admin tooling. It is already inside every total on this
                page and is broken out because it is not learner demand, and one person&apos;s
                build can outweigh a tenant&apos;s entire learner traffic. Role is resolved
                against the tenant the spend belongs to, so somebody who is staff on one tenant
                and a learner on another appears only for the first.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-themed text-left text-xs uppercase tracking-wide text-text-dim">
                      <th className="pb-2 pr-4 font-medium">Person</th>
                      <th className="pb-2 pr-4 font-medium">Role</th>
                      <th className="pb-2 pr-4 font-medium">Tenant</th>
                      <th className="pb-2 pr-4 text-right font-medium">Spend</th>
                      <th className="pb-2 pr-4 text-right font-medium">Tokens</th>
                      <th className="pb-2 text-right font-medium">Calls</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffAi.people.map((sp) => (
                      <tr
                        key={`${sp.user_id}-${sp.client_id ?? 'platform'}`}
                        className="border-b border-themed/50 last:border-0"
                      >
                        <td className="py-2 pr-4">
                          <span className="text-text">{sp.name || sp.email}</span>
                          {sp.name && (
                            <span className="block text-xs text-text-dim">{sp.email}</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-text-dim">{sp.role}</td>
                        <td className={cn('py-2 pr-4', sp.client_id === null ? 'italic text-text-dim' : 'text-text-dim')}>
                          {sp.client_name}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-text">{usd(sp.cost_usd)}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{sp.tokens.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums text-text-dim">{sp.events.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

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
        </>
      ) : null}
    </div>
  );
};

export default AiCostDaily;
