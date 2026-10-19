import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Coins,
  Activity,
  Search,
  Users,
} from 'lucide-react';
import { apiService } from '../../services/api';
import type { FleetInsights as FleetData, FleetClientRow } from '../../types/clientInsights';

/**
 * Which tenant to look at, before you look at one.
 *
 * The per-client panel answers "how is this tenant doing" once you already suspect something.
 * This answers the question that comes first, and the shape it reveals is the point: a tenant
 * can have a sixth of another's students and four times its bill. That comparison does not
 * exist on any single client page.
 *
 * Three classes used by the first version emitted NO CSS at all, which is why the shipped
 * table had an empty Trend column and an invisible selected window button:
 *   - `bg-accent`  - `accent` is a shade scale (50/100/500/600) with no DEFAULT key, so
 *                    Tailwind never generated the rule. The sparkline bars had no colour, and
 *                    the selected `7d` button was white text on nothing.
 *   - `text-muted` - the token is `text.mute`, so the class is `text-text-mute`. Every
 *                    "muted" label was simply inheriting its parent's colour.
 * Verified against the published stylesheet, not the source: a grep of the deployed CSS found
 * 0 rules for both. Only names that exist in tailwind.config.js are used below.
 */

const WINDOWS = [7, 14, 30, 90] as const;

type SortKey =
  | 'name'
  | 'students'
  | 'active_users'
  | 'active_rate'
  | 'learning_minutes'
  | 'tokens'
  | 'cost_usd'
  | 'cost_per_student';

type Segment = 'all' | 'live' | 'quiet';

const SEGMENTS: { key: Segment; label: string; hint: string }[] = [
  { key: 'all', label: 'All', hint: 'Every tenant with students or activity' },
  { key: 'live', label: 'Active', hint: 'Someone turned up in this window' },
  { key: 'quiet', label: 'Quiet', hint: 'Has students, nobody turned up' },
];

function money(n: number): string {
  if (!n) return '$0.00';
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

/** Per-head cost runs to fractions of a cent, so it gets its own precision. */
function perHead(n: number | null): string {
  if (n === null) return '—';
  if (n === 0) return '$0';
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

function rate(n: number | null): string {
  return n === null ? '—' : `${(n * 100).toFixed(n < 0.1 ? 1 : 0)}%`;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** Minutes read as hours past a couple of hours; nobody parses "31766 minutes". */
function duration(mins: number): string {
  if (!mins) return '—';
  if (mins < 120) return `${mins}m`;
  const h = mins / 60;
  return h >= 100 ? `${Math.round(h).toLocaleString()}h` : `${h.toFixed(1)}h`;
}

/**
 * A sparkline drawn as bars, scaled to the row's OWN peak so each tenant's shape is readable;
 * the absolute numbers sit in the columns beside it. A zero day stays a visible stub rather
 * than a gap, because a gap reads as missing data when it means "nobody came".
 */
function Spark({ values, peak }: { values: number[]; peak: number }) {
  const top = Math.max(peak, 1);
  if (!values.length) return <span className="text-text-mute text-xs">—</span>;
  return (
    <div className="flex items-end gap-[1.5px] h-7" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className={`w-[3px] rounded-[1px] ${v === 0 ? 'bg-line/20' : 'bg-brand-cyan/80'}`}
          style={{ height: v === 0 ? '10%' : `${Math.max(14, (v / top) * 100)}%` }}
        />
      ))}
    </div>
  );
}

/**
 * The share of the roll that turned up, as a bar as well as a number.
 * A big tenant at 0.2% and one at 48% read identically as two-digit text in a dense table;
 * the bar is what makes the difference visible at a glance, which is the whole job here.
 */
function RateBar({ value }: { value: number | null }) {
  if (value === null) return <span className="text-text-mute">—</span>;
  const pct = Math.min(100, Math.max(0, value * 100));
  const tone =
    pct >= 25 ? 'bg-brand-cyan' : pct >= 5 ? 'bg-brand-gold' : 'bg-danger-500';
  return (
    <div className="flex items-center justify-end gap-2">
      <span className="tabular-nums text-text-dim text-[11px] w-9 text-right">
        {rate(value)}
      </span>
      <span className="relative block h-1.5 w-12 rounded-full bg-line/10 overflow-hidden">
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${tone}`}
          style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
        />
      </span>
    </div>
  );
}

const COLUMNS: { key: SortKey; label: string; align: 'left' | 'right'; title?: string }[] = [
  { key: 'name', label: 'Client', align: 'left' },
  { key: 'students', label: 'Students', align: 'right', title: 'Everyone on the roll' },
  {
    key: 'active_rate',
    label: 'Turned up',
    align: 'right',
    title: 'Distinct students who opened the platform, and their share of the roll',
  },
  {
    key: 'learning_minutes',
    label: 'Learning',
    align: 'right',
    title: 'Time spent on actual coursework, not just time on the platform',
  },
  { key: 'tokens', label: 'Tokens', align: 'right' },
  { key: 'cost_usd', label: 'Spend', align: 'right' },
  { key: 'cost_per_student', label: 'Per student', align: 'right', title: 'Spend ÷ headcount' },
];

/** None sorts last on every descending column: "no students" is not "fewest students". */
function compare(a: FleetClientRow, b: FleetClientRow, key: SortKey): number {
  if (key === 'name') return (a.name || '').localeCompare(b.name || '');
  const av = a[key];
  const bv = b[key];
  if (av === null && bv === null) return 0;
  if (av === null) return 1;
  if (bv === null) return -1;
  return (bv as number) - (av as number);
}

export function FleetInsights() {
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(14);
  const [sort, setSort] = useState<SortKey>('active_users');
  const [ascending, setAscending] = useState(false);
  const [segment, setSegment] = useState<Segment>('all');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [data, setData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only the window refetches. Sorting and filtering 36 rows in the browser is instant, and a
  // round trip per column click made the table feel broken.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .getFleetInsights(days, 'active')
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch(() => {
        // An empty table with no message reads as "no tenant did anything", which is a very
        // different claim from "we could not load this".
        if (!cancelled) setError('Could not load fleet activity.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days]);

  const all = useMemo<FleetClientRow[]>(() => data?.clients ?? [], [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = all.filter((r) => {
      if (segment === 'live' && !r.active_users) return false;
      if (segment === 'quiet' && !(r.students > 0 && r.active_users === 0)) return false;
      if (!q) return true;
      return (
        (r.name || '').toLowerCase().includes(q) || (r.slug || '').toLowerCase().includes(q)
      );
    });
    out = [...out].sort((a, b) => compare(a, b, sort));
    return ascending ? out.reverse() : out;
  }, [all, segment, query, sort, ascending]);

  const quietCount = useMemo(
    () => all.filter((r) => r.students > 0 && r.active_users === 0).length,
    [all]
  );

  const fleetRate = data && data.totals.students
    ? data.totals.active_users / data.totals.students
    : null;

  function toggleSort(key: SortKey) {
    if (key === sort) {
      setAscending((v) => !v);
    } else {
      setSort(key);
      setAscending(key === 'name');
    }
  }

  return (
    <section className="rounded-xl border border-themed surface-card p-6 shadow-glass mb-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="kicker mb-2">Across every client</span>
          <h3 className="serif-display text-[20px] text-text">Who is active, and who is costing</h3>
          <p className="text-xs text-text-mute mt-1 max-w-2xl">
            Students on the platform, how many turned up, what they studied and what they cost.
            A student counts as active on any day they open the platform. Click a row to expand
            it, or the name to open that client.
          </p>
        </div>
        <div className="flex gap-1" role="group" aria-label="Time window">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              aria-pressed={days === w}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                days === w
                  ? 'bg-brand-blue text-white shadow-sm'
                  : 'border border-themed text-text-dim hover:text-text hover:border-themed-2'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-10 text-center text-sm text-text-mute">Loading…</div>}

      {error && !loading && (
        <div className="flex items-center gap-2 py-6 text-sm text-brand-gold">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {data && !loading && !error && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Stat
              icon={<Users size={14} />}
              label="Students"
              value={data.totals.students.toLocaleString()}
              sub={`${data.totals.active_users.toLocaleString()} turned up in ${data.window.days}d`}
            />
            <Stat
              icon={<Activity size={14} />}
              label="Engagement"
              value={rate(fleetRate)}
              sub={`${data.totals.clients_with_activity} of ${all.length} tenants had anyone`}
              tone={fleetRate !== null && fleetRate < 0.05 ? 'warn' : undefined}
            />
            <Stat
              icon={<Coins size={14} />}
              label="AI spend"
              value={money(data.totals.cost_usd)}
              sub={`${perHead(
                data.totals.students ? data.totals.cost_usd / data.totals.students : null
              )} per student · ${compact(data.totals.tokens)} tokens`}
            />
            <Stat
              label="Platform-level"
              value={money(data.totals.unowned_cost_usd)}
              sub={`${data.totals.unowned_events.toLocaleString()} calls, no client attached`}
            />
          </div>

          {data.totals.unowned_cost_usd > 0 && (
            <p className="mb-4 text-xs text-text-mute flex items-start gap-1.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>
                The {money(data.totals.unowned_cost_usd)} platform-level figure
                ({data.totals.unowned_events} calls) is work that belongs to no client — course
                builds, briefings, scheduled jobs. It is deliberately not spread across the
                clients below, which did not incur it.
              </span>
            </p>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-mute pointer-events-none"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Filter ${all.length} tenants…`}
                aria-label="Filter clients by name"
                className="w-56 pl-7 pr-2.5 py-1.5 rounded-lg border border-themed bg-transparent
                  text-xs text-text placeholder:text-text-mute focus:outline-none
                  focus:border-brand-cyan/60"
              />
            </div>
            <div className="flex gap-1" role="group" aria-label="Filter by activity">
              {SEGMENTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  title={s.hint}
                  onClick={() => setSegment(s.key)}
                  aria-pressed={segment === s.key}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    segment === s.key
                      ? 'bg-brand-blue text-white'
                      : 'border border-themed text-text-dim hover:text-text'
                  }`}
                >
                  {s.label}
                  {s.key === 'quiet' && quietCount > 0 && (
                    <span className="ml-1.5 opacity-70">{quietCount}</span>
                  )}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-text-mute ml-auto tabular-nums">
              {rows.length} of {all.length} shown
            </span>
          </div>

          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-mute">
              {all.length === 0
                ? 'No client recorded any activity or spend in this window.'
                : 'No tenant matches that filter.'}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-sm border-separate border-spacing-0">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wide text-text-mute">
                    <th className="py-2 pr-2 w-6" />
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        title={c.title}
                        className={`sticky top-0 z-10 surface-card py-2 px-3 font-semibold
                          border-b border-themed whitespace-nowrap
                          ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                      >
                        <button
                          type="button"
                          onClick={() => toggleSort(c.key)}
                          className={`inline-flex items-center gap-1 hover:text-text transition
                            ${sort === c.key ? 'text-text' : ''}`}
                        >
                          {c.align === 'right' && sort === c.key && <SortIcon up={ascending} />}
                          {c.label}
                          {c.align === 'left' && sort === c.key && <SortIcon up={ascending} />}
                        </button>
                      </th>
                    ))}
                    <th className="sticky top-0 z-10 surface-card py-2 px-3 font-semibold
                      border-b border-themed text-left">
                      Trend
                    </th>
                    <th className="sticky top-0 z-10 surface-card py-2 pl-2 border-b border-themed" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const open = expanded === r.id;
                    return (
                      <>
                        <tr
                          key={r.id}
                          onClick={() => setExpanded(open ? null : r.id)}
                          className={`cursor-pointer transition border-b border-themed/40
                            ${open ? 'bg-line/[0.04]' : 'hover:bg-line/[0.03]'}`}
                        >
                          <td className="py-2.5 pr-2 text-text-mute align-middle">
                            {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </td>
                          <td className="py-2.5 px-3 min-w-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/clients/${r.id}`);
                              }}
                              className="font-medium text-text truncate flex items-center gap-2
                                hover:text-brand-cyan transition text-left"
                            >
                              {r.name || `Client ${r.id}`}
                              {r.is_active === false && (
                                // A deactivated tenant still shows its numbers - they are real
                                // and often the reason someone is looking - but the state is said.
                                <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5
                                  rounded bg-brand-gold/15 text-brand-gold shrink-0">
                                  inactive
                                </span>
                              )}
                            </button>
                            <div className="text-xs text-text-mute truncate">{r.slug}</div>
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-text">
                            {r.students ? r.students.toLocaleString() : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="tabular-nums text-text">{r.active_users || '—'}</div>
                            {r.students > 0 && <RateBar value={r.active_rate} />}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-text-dim">
                            {duration(r.learning_minutes)}
                            {r.minutes > 0 && (
                              <span className="block text-[11px] text-text-mute">
                                of {duration(r.minutes)} on site
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-text-dim">
                            {r.tokens ? compact(r.tokens) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-text">
                            {r.cost_usd ? money(r.cost_usd) : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-text-dim">
                            {perHead(r.cost_per_student)}
                          </td>
                          <td className="py-2.5 px-3">
                            <Spark values={r.spark} peak={r.peak_day_users} />
                          </td>
                          <td className="py-2.5 pl-2" />
                        </tr>

                        {open && (
                          <tr key={`${r.id}-detail`} className="bg-line/[0.02]">
                            <td />
                            <td colSpan={9} className="px-3 pb-4 pt-1">
                              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3">
                                <Fact label="Today" value={r.today_users ? `${r.today_users} active` : 'nobody yet'} />
                                <Fact label="Busiest day" value={r.peak_day_users ? `${r.peak_day_users} students` : '—'} />
                                <Fact
                                  label="Days with activity"
                                  value={`${r.active_days} of ${data.window.days}`}
                                />
                                <Fact label="Time on site" value={duration(r.minutes)} />
                                <Fact label="AI calls" value={r.events ? r.events.toLocaleString() : '—'} />
                                <Fact
                                  label="Spend by a named person"
                                  value={
                                    r.cost_usd
                                      ? `${money(r.attributed_usd)} of ${money(r.cost_usd)}`
                                      : '—'
                                  }
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => navigate(`/clients/${r.id}`)}
                                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold
                                  text-brand-cyan hover:underline"
                              >
                                Open {r.name || `client ${r.id}`} <ChevronRight size={13} />
                              </button>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function SortIcon({ up }: { up: boolean }) {
  return up ? <ArrowUp size={11} /> : <ArrowDown size={11} />;
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-text-mute">
        {label}
      </div>
      <div className="text-sm text-text tabular-nums truncate">{value}</div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tone?: 'warn';
}) {
  return (
    <div className="rounded-lg border border-themed p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-text-mute uppercase tracking-wide">
        {icon}
        {label}
      </div>
      <div
        className={`mt-0.5 text-xl font-bold tabular-nums truncate ${
          tone === 'warn' ? 'text-brand-gold' : 'text-text'
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-text-mute truncate" title={sub}>
        {sub}
      </div>
    </div>
  );
}

export default FleetInsights;
