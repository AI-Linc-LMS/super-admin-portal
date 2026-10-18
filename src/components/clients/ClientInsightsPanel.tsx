import { useEffect, useMemo, useState } from 'react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Users, Coins, AlertCircle, Search } from 'lucide-react';
import { apiService } from '../../services/api';
import type { ClientInsights, InsightPerson } from '../../types/clientInsights';

/**
 * Two trends for one tenant — people turning up, and money going out — and the module naming
 * who is behind both.
 *
 * "Active" means landed on the dashboard that day, which is the owner's definition and the one
 * the backend measures. `learning_minutes` is shown next to it rather than instead of it, so
 * "turned up" and "actually worked" stay distinguishable instead of being averaged into one
 * flattering number.
 *
 * The unattributed-spend line is not decoration. ~9.8% of production spend has no person behind
 * it, so a people list shown beside the total without that line would read as the whole bill
 * being accounted for by name. If the number is non-zero it is stated.
 */

const WINDOWS = [7, 14, 30, 90] as const;

function money(n: number): string {
  if (n === 0) return '$0.00';
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function shortDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : `${d.getDate()}/${d.getMonth() + 1}`;
}

export function ClientInsightsPanel({ clientId }: { clientId: number }) {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<ClientInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .getClientInsights(clientId, days)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {
        // Say the data is missing. An empty chart with no explanation reads as "this tenant has
        // no activity", which is a different and much worse claim than "we could not load it".
        if (!cancelled) setError('Could not load insights for this client.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId, days]);

  const people = useMemo<InsightPerson[]>(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.people;
    return data.people.filter(
      (p) => p.email.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="rounded-xl border border-themed surface-card p-6 shadow-glass mb-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="kicker mb-2">Engagement &amp; spend</span>
          <h3 className="serif-display text-[20px] text-text">Who is here, and what it costs</h3>
          <p className="text-xs text-muted mt-1">
            A student counts as active on any day they open the platform.
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
                  ? 'bg-accent text-white'
                  : 'border border-themed text-muted hover:text-text'
              }`}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="py-10 text-center text-sm text-muted">Loading…</div>}

      {error && !loading && (
        <div className="flex items-center gap-2 py-6 text-sm text-amber-600">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {data && !loading && !error && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Trend
              title="Active students"
              icon={<Users size={15} />}
              headline={String(data.active.distinct_total)}
              caption={`distinct in ${data.window.days}d · peak ${data.active.peak_day_users}/day · ${data.active.today_users} today`}
              series={data.active.series.map((p) => ({ date: p.date, value: p.users }))}
              color="#6366f1"
              format={(v) => String(v)}
            />
            <Trend
              title="AI spend"
              icon={<Coins size={15} />}
              headline={money(data.cost.total_usd)}
              caption={`${compact(data.cost.total_tokens)} tokens · ${data.cost.events} calls`}
              series={data.cost.series.map((p) => ({ date: p.date, value: p.cost_usd }))}
              color="#14b8a6"
              format={money}
            />
          </div>

          {data.cost.unattributed_usd > 0 && (
            <p className="mt-3 text-xs text-muted flex items-start gap-1.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>
                {money(data.cost.attributed_usd)} of this is attributable to a named person
                below. The remaining {money(data.cost.unattributed_usd)} is background work
                (course builds, briefings, scheduled jobs) with no learner behind it.
              </span>
            </p>
          )}

          <div className="mt-7 pt-6 border-t border-themed">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-text">
                People ({data.people.length})
                {data.people_truncated && (
                  <span className="ml-2 text-xs font-normal text-amber-600">
                    showing the first {data.people.length} — narrow the window to see all
                  </span>
                )}
              </h4>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name or email"
                  aria-label="Search people"
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-themed bg-transparent text-xs text-text w-56"
                />
              </div>
            </div>

            {people.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                {query ? 'Nobody matches that search.' : 'Nobody was active in this window.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                      <th className="py-2 pr-3 font-semibold">Person</th>
                      <th className="py-2 px-3 font-semibold text-right">Active days</th>
                      <th className="py-2 px-3 font-semibold text-right">Time</th>
                      <th className="py-2 px-3 font-semibold text-right">Tokens</th>
                      <th className="py-2 pl-3 font-semibold text-right">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {people.map((p) => (
                      <tr key={p.user_id} className="border-t border-themed/50">
                        <td className="py-2 pr-3 min-w-0">
                          <div className="font-medium text-text truncate">{p.name || '—'}</div>
                          <div className="text-xs text-muted truncate">{p.email}</div>
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-text">
                          {p.active_days === 0 ? (
                            // Real and worth distinguishing: a background task can spend on
                            // someone's behalf while the tracker, which writes only while the
                            // app is open, recorded no visit.
                            <span className="text-muted" title="Spent without a tracked visit">—</span>
                          ) : p.active_days}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-muted">
                          {p.minutes}m
                          {p.learning_minutes > 0 && (
                            <span className="text-[11px]" title="Of which on a learning surface">
                              {' '}({p.learning_minutes}m learning)
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right tabular-nums text-muted">
                          {p.tokens ? compact(p.tokens) : '—'}
                        </td>
                        <td className="py-2 pl-3 text-right tabular-nums font-semibold text-text">
                          {p.cost_usd ? money(p.cost_usd) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Trend({
  title, icon, headline, caption, series, color, format,
}: {
  title: string;
  icon: React.ReactNode;
  headline: string;
  caption: string;
  series: { date: string; value: number }[];
  color: string;
  format: (v: number) => string;
}) {
  const allZero = series.every((p) => p.value === 0);
  return (
    <div className="rounded-lg border border-themed p-4 min-w-0">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-muted uppercase tracking-wide">
        <span style={{ color }}>{icon}</span>
        {title}
      </div>
      <div className="mt-1 text-2xl font-bold text-text tabular-nums">{headline}</div>
      <div className="text-xs text-muted">{caption}</div>

      <div className="mt-3" style={{ height: 120 }}>
        {allZero ? (
          // A flat line at zero is the truth here and says it plainly. Hiding the chart would
          // leave the reader guessing whether the data failed to load.
          <div className="h-full flex items-center justify-center text-xs text-muted border border-dashed border-themed rounded">
            Nothing recorded in this window
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${title.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.1} vertical={false} />
              <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 10 }}
                     stroke="currentColor" opacity={0.5} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.5}
                     tickFormatter={(v) => (typeof v === 'number' && v < 1 && v > 0 ? '' : compact(Number(v)))} />
              <Tooltip
                formatter={(v) => format(Number(v))}
                labelFormatter={(l) => String(l)}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2}
                    fill={`url(#g-${title.replace(/\s/g, '')})`} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

export default ClientInsightsPanel;
