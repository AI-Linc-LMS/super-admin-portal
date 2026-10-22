import React from 'react';
import { Users, UserCog, CalendarDays, Coins, Eye, Building2 } from 'lucide-react';

import StatsCard from '../charts/StatsCard';
import AnalyticsChart from '../charts/AnalyticsChart';
import { PeopleCalendar, PeopleMode } from './PeopleCalendar';
import { useAiCostDaily } from '../../hooks/useAiCostDaily';
import { cn } from '../../utils/helpers';

/**
 * Who was on the platform, and who spent the money.
 *
 * The two pages this module replaced could both say what was spent and by which tenant.
 * Neither could say WHO, and a per-client total does not distinguish two hundred learners from
 * one admin running course builds - which call for opposite responses.
 *
 * The day detail is fetched on demand rather than shipped with the window. A
 * person-by-day-by-tenant matrix over 180 days is far larger than this page needs and almost
 * none of it would ever be read, so clicking a day asks for that day.
 */

const usd = (n: number): string => {
  const v = Number(n || 0);
  const decimals = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

interface Props {
  /** The same filters the rest of the module is showing, so the numbers agree. */
  params: {
    days: number;
    feature?: string;
    model?: string;
    module?: string;
    start?: string;
    end?: string;
  };
}

export const PeoplePanel: React.FC<Props> = ({ params }) => {
  const [mode, setMode] = React.useState<PeopleMode>('users');
  const [picked, setPicked] = React.useState<string | null>(null);
  const [client, setClient] = React.useState<string>('');

  // The tenant selection narrows everything on this tab at once: both headcounts, the
  // calendar, the day detail and the spend table. Narrowing only some of them would put two
  // populations on one screen and invite reading a ratio between them.
  const scoped = React.useMemo(
    () => (client
      ? { ...params, client_id: (client === 'platform' ? 'platform' : Number(client)) as number | 'platform' }
      : params),
    [params, client],
  );

  const windowQuery = useAiCostDaily(scoped);
  // A second request carrying `date`. Keeping it separate means opening a day never refetches
  // the window, and the calendar does not flicker while the detail loads.
  const dayQuery = useAiCostDaily(picked ? { ...scoped, date: picked } : scoped);

  const data = windowQuery.data;
  const people = data?.people;
  const series = people?.series ?? [];
  const tokenUsers = data?.token_users;
  const pickable = data?.available_clients ?? [];
  const roster = data?.roster;
  const win = data?.window;
  const chosen = pickable.find((c) => String(c.client_id) === client) ?? null;
  const detail = picked ? dayQuery.data?.day_detail ?? null : null;
  const detailLoading = Boolean(picked) && dayQuery.isFetching && !detail;

  if (windowQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-themed surface-card p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="kicker mb-1 text-brand-cyan">Who was here</p>
            <h2 className="text-lg font-medium text-text">
              People on the platform, by day
              {chosen && <span className="text-text-dim"> · {chosen.client_name}</span>}
            </h2>
            {win && (
              <p className="mt-1 text-xs text-brand-cyan">
                {win.start} to {win.end} · {win.days} day{win.days === 1 ? '' : 's'}
                {data?.filters?.requested_range ? ' · your range' : ' · rolling window'}
              </p>
            )}
            <p className="mt-1 max-w-2xl text-xs text-text-dim">
              Distinct people with tracked time that day, students and staff counted separately.
              This is <strong>not</strong> a login count: nothing records a login, so a sign-in
              that left no activity is not here. These two counts also ignore the surface and
              model filters, because being on the platform is not an AI call. Everything about
              spend below them does respect the filters.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Building2 className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
              <select
                className="rounded-lg border border-themed bg-line/[0.03] py-2 pl-9 pr-3 text-sm text-text focus:border-brand-cyan/50 focus:outline-none"
                value={client}
                onChange={(e) => { setClient(e.target.value); setPicked(null); }}
                aria-label="Client"
              >
                <option value="">All clients</option>
                {pickable.map((c) => (
                  <option key={String(c.client_id)} value={String(c.client_id)}>
                    {c.client_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex rounded-lg border border-themed p-0.5" role="group" aria-label="Population">
            {([
              { key: 'users' as PeopleMode, label: 'Students', icon: Users },
              { key: 'staff' as PeopleMode, label: 'Staff', icon: UserCog },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setMode(key)}
                aria-pressed={mode === key}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition',
                  mode === key ? 'bg-brand-cyan/15 text-brand-cyan' : 'text-text-dim hover:text-text',
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
              ))}
            </div>
          </div>
        </div>

        {chosen?.is_platform && (
          <div className="mb-5 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-300">
            Platform / internal is real spend with no tenant behind it, so it has nobody on a
            platform. The two headcounts below are zero by definition rather than by a quiet
            failure; the spend figures are the ones that mean something here.
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatsCard title="Students in window" value={people?.distinct_total ?? 0} suffix=" distinct" icon={Users} color="primary" />
          <StatsCard title="Staff in window" value={people?.staff_distinct_total ?? 0} suffix=" distinct" icon={UserCog} color="secondary" />
          <StatsCard
            title="Busiest day"
            value={people?.peak_day?.users ?? 0}
            suffix={people?.peak_day ? ` · ${people.peak_day.date}` : undefined}
            icon={CalendarDays}
            color="accent"
          />
          <StatsCard
            title="Named AI spend"
            value={usd(tokenUsers?.cost_usd ?? 0)}
            suffix={tokenUsers?.events ? ` · ${tokenUsers.events.toLocaleString()} calls` : undefined}
            icon={Coins}
            color="danger"
          />
        </div>

        <AnalyticsChart
          title={mode === 'staff' ? 'Active staff per day' : 'Active students per day'}
          kicker={chosen ? chosen.client_name : 'All tenants'}
          data={series.map((d) => ({ bucket: d.date, users: d.users, staff: d.staff }))}
          type="area"
          dataKey={mode}
          xAxisKey="bucket"
          height={260}
        />

        <div className="mt-8">
          <p className="kicker mb-1 text-brand-cyan">Calendar</p>
          <h3 className="mb-1 text-base font-medium text-text">
            {mode === 'staff' ? 'Staff' : 'Students'} by date
          </h3>
          <p className="mb-4 text-xs text-text-dim">
            The same numbers on real month grids, so a quiet Saturday reads as a weekend rather
            than as a dip. <strong>Click a day</strong> to see exactly who was on the platform
            that day, what they spent, and which tenant they belong to.
          </p>
          <PeopleCalendar days={series} mode={mode} selected={picked} onSelect={setPicked} />
        </div>
      </div>

      {picked && (
        <div className="rounded-2xl border border-brand-cyan/30 surface-card p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="kicker mb-1 text-brand-cyan">One day</p>
              <h2 className="text-lg font-medium text-text">{picked}</h2>
              {detail && (
                <p className="mt-1 text-xs text-text-dim">
                  {detail.totals.people} {detail.totals.people === 1 ? 'person' : 'people'} ·{' '}
                  {detail.totals.visited} visited · {detail.totals.spenders} spent ·{' '}
                  {usd(detail.totals.cost_usd)} · {detail.totals.tokens.toLocaleString()} tokens
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setPicked(null)}
              className="rounded-lg border border-themed px-3 py-1.5 text-sm text-text-dim hover:text-text"
            >
              Close
            </button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-10">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-cyan border-t-transparent" />
            </div>
          ) : detail && detail.people.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-themed text-left text-xs uppercase tracking-wide text-text-dim">
                    <th className="pb-2 pr-4 font-medium">Person</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 pr-4 font-medium">Client</th>
                    <th className="pb-2 pr-4 text-right font-medium">On platform</th>
                    <th className="pb-2 pr-4 text-right font-medium">Tokens</th>
                    <th className="pb-2 pr-4 text-right font-medium">Calls</th>
                    <th className="pb-2 text-right font-medium">Spend</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.people.map((p) => (
                    <tr key={`${p.user_id}-${p.client_id ?? 'platform'}`} className="border-b border-themed/50 last:border-0">
                      <td className="py-2 pr-4">
                        <span className="text-text">{p.name || p.email}</span>
                        {p.name && <span className="block text-xs text-text-dim">{p.email}</span>}
                      </td>
                      <td className="py-2 pr-4">
                        <span className={cn('text-xs', p.is_staff ? 'text-amber-400' : 'text-text-dim')}>
                          {p.role}
                        </span>
                      </td>
                      <td className={cn('py-2 pr-4 text-text-dim', p.client_id === null && 'italic')}>
                        {p.client_name}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-text-dim">
                        {p.visited ? (
                          `${p.minutes.toLocaleString()} min`
                        ) : (
                          <span className="inline-flex items-center gap-1 text-text-dim/70" title="Spent without a tracked session: a background task acting on their behalf.">
                            <Eye className="h-3 w-3" /> no session
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{p.tokens.toLocaleString()}</td>
                      <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{p.events.toLocaleString()}</td>
                      <td className="py-2 text-right tabular-nums text-text">{p.cost_usd ? usd(p.cost_usd) : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-xs text-text-dim">
                A row reading &quot;no session&quot; spent money without any tracked time. That is
                real: a background task can call the model on somebody&apos;s behalf, and the
                tracker only writes while the app is open.
              </p>
            </div>
          ) : (
            <p className="py-6 text-sm text-text-dim">Nobody was on the platform on this day.</p>
          )}
        </div>
      )}

      {roster && roster.people.length > 0 && (
        <div className="rounded-2xl border border-themed surface-card p-6">
          <p className="kicker mb-1 text-brand-cyan">Across the window</p>
          <h2 className="mb-1 text-lg font-medium text-text">
            Who was active{chosen ? ` on ${chosen.client_name}` : ''}
          </h2>
          <p className="mb-4 max-w-3xl text-xs text-text-dim">
            One row per person for the whole window, not one per visit. Somebody who came on
            twenty days appears once, with twenty in the days column: summing a per-day roster
            would count them twenty times, which is the usual way this number gets overstated.
            {roster.totals.spend_only > 0 && (
              <>
                {' '}
                <strong>{roster.totals.spend_only}</strong>{' '}
                {roster.totals.spend_only === 1 ? 'person' : 'people'} below spent without any
                tracked session, shown as &quot;none&quot; in the days column. They are in the
                spend figures but not in the two headcounts, because a figure labelled active
                has to mean active.
              </>
            )}
          </p>

          <div className="mb-5 grid grid-cols-2 gap-5 sm:grid-cols-3 xl:grid-cols-5">
            <StatsCard title="Clients active" value={roster.clients_active} icon={Building2} color="primary" />
            <StatsCard title="Students active" value={roster.totals.students} icon={Users} color="primary" />
            <StatsCard title="Staff active" value={roster.totals.staff} icon={UserCog} color="secondary" />
            <StatsCard title="Spent on AI" value={roster.totals.spenders} suffix=" people" icon={Coins} color="accent" />
            <StatsCard title="Spend in window" value={usd(roster.totals.cost_usd)} icon={Coins} color="danger" />
          </div>

          {roster.clients.length > 0 && (
            <div className="mb-6 rounded-xl border border-themed bg-line/[0.02] p-5">
              <h3 className="mb-1 text-sm font-medium text-text">
                {roster.clients_active} client{roster.clients_active === 1 ? '' : 's'} had
                somebody on {roster.clients_active === 1 ? 'it' : 'them'}
                {roster.totals.clients_listed > roster.clients_active && (
                  <span className="text-text-dim">
                    {' '}· {roster.totals.clients_listed - roster.clients_active} more had spend
                    but nobody on them
                  </span>
                )}
              </h3>
              <p className="mb-4 text-xs text-text-dim">
                Active means somebody turned up, not that money was spent. A tenant with
                learners and no AI spend is a live tenant, and the cost heatmap cannot show
                that because it is built from the spend ledger alone.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-themed text-left text-xs uppercase tracking-wide text-text-dim">
                      <th className="pb-2 pr-4 font-medium">Client</th>
                      <th className="pb-2 pr-4 text-right font-medium">Students</th>
                      <th className="pb-2 pr-4 text-right font-medium">Staff</th>
                      <th className="pb-2 pr-4 text-right font-medium">Minutes</th>
                      <th className="pb-2 pr-4 font-medium">Last seen</th>
                      <th className="pb-2 text-right font-medium">Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.clients.map((c) => (
                      <tr
                        key={String(c.client_id ?? 'platform')}
                        className={cn(
                          'border-b border-themed/50 last:border-0',
                          !c.people && 'opacity-60',
                        )}
                      >
                        <td className={cn('py-2 pr-4', c.is_platform ? 'italic text-text-dim' : 'text-text')}>
                          {c.client_name}
                          {!c.people && (
                            <span className="ml-2 text-xs text-text-dim" title="Spend recorded, but nobody had a tracked session.">
                              nobody on it
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-right tabular-nums text-text">{c.students.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{c.staff.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{c.minutes.toLocaleString()}</td>
                        <td className="py-2 pr-4 text-text-dim">{c.last_active ?? '-'}</td>
                        <td className="py-2 text-right tabular-nums text-text">{c.cost_usd ? usd(c.cost_usd) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-themed text-left text-xs uppercase tracking-wide text-text-dim">
                  <th className="pb-2 pr-4 font-medium">Person</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Client</th>
                  <th className="pb-2 pr-4 text-right font-medium">Days active</th>
                  <th className="pb-2 pr-4 text-right font-medium">Minutes</th>
                  <th className="pb-2 pr-4 font-medium">Last seen</th>
                  <th className="pb-2 text-right font-medium">Spend</th>
                </tr>
              </thead>
              <tbody>
                {roster.people.map((p) => (
                  <tr key={`${p.user_id}-${p.client_id ?? 'platform'}`} className="border-b border-themed/50 last:border-0">
                    <td className="py-2 pr-4">
                      <span className="text-text">{p.name || p.email}</span>
                      {p.name && <span className="block text-xs text-text-dim">{p.email}</span>}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={cn('text-xs', p.is_staff ? 'text-amber-400' : 'text-text-dim')}>
                        {p.role}
                      </span>
                    </td>
                    <td className={cn('py-2 pr-4 text-text-dim', p.client_id === null && 'italic')}>
                      {p.client_name}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-text">
                      {p.active_days || (
                        <span className="text-text-dim/70" title="Spent without any tracked session in this window.">
                          none
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{p.minutes.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-text-dim">{p.last_active ?? '-'}</td>
                    <td className="py-2 text-right tabular-nums text-text">{p.cost_usd ? usd(p.cost_usd) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {roster.truncated && (
            <p className="mt-3 text-xs text-amber-300">
              Showing the first {roster.people.length} of {roster.totals.people} people. Narrow
              the window or pick a client to see the rest.
            </p>
          )}
        </div>
      )}

      {tokenUsers && tokenUsers.people.length > 0 && (
        <div className="rounded-2xl border border-themed surface-card p-6">
          <p className="kicker mb-1 text-brand-cyan">Across the window</p>
          <h2 className="mb-1 text-lg font-medium text-text">
            Who spent{chosen ? ` on ${chosen.client_name}` : ', and for which tenant'}
          </h2>
          <p className="mb-4 max-w-3xl text-xs text-text-dim">
            Every person with AI spend attributed to them, learners and staff alike, each with
            the tenant the spend belongs to. Role is resolved against <em>that</em> tenant, so
            somebody who is staff on one and a learner on another is labelled correctly for
            each. Rows marked <span className="text-amber-400">staff</span> are course builds,
            sweeps and admin tooling rather than learner demand.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-themed text-left text-xs uppercase tracking-wide text-text-dim">
                  <th className="pb-2 pr-4 font-medium">Person</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Client</th>
                  <th className="pb-2 pr-4 text-right font-medium">Tokens</th>
                  <th className="pb-2 pr-4 text-right font-medium">Calls</th>
                  <th className="pb-2 text-right font-medium">Spend</th>
                </tr>
              </thead>
              <tbody>
                {tokenUsers.people.map((p) => (
                  <tr key={`${p.user_id}-${p.client_id ?? 'platform'}`} className="border-b border-themed/50 last:border-0">
                    <td className="py-2 pr-4">
                      <span className="text-text">{p.name || p.email}</span>
                      {p.name && <span className="block text-xs text-text-dim">{p.email}</span>}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={cn('text-xs', p.is_staff ? 'text-amber-400' : 'text-text-dim')}>
                        {p.role}
                      </span>
                    </td>
                    <td className={cn('py-2 pr-4 text-text-dim', p.client_id === null && 'italic')}>
                      {p.client_name}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{p.tokens.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{p.events.toLocaleString()}</td>
                    <td className="py-2 text-right tabular-nums text-text">{usd(p.cost_usd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default PeoplePanel;
