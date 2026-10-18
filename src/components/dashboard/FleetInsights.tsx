import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Coins, AlertCircle, ChevronRight } from 'lucide-react';
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
 * Every row is a link into that client's detail, so this is a way in rather than a dead end.
 */

const WINDOWS = [7, 14, 30, 90] as const;
type SortKey = 'active' | 'cost' | 'tokens' | 'name';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'active', label: 'Most active' },
  { key: 'cost', label: 'Most spend' },
  { key: 'tokens', label: 'Most tokens' },
  { key: 'name', label: 'Name' },
];

function money(n: number): string {
  if (!n) return '$0.00';
  return n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(2)}`;
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/** A sparkline drawn as bars. Scaled to the row's OWN peak, so each tenant's shape is
 *  readable; the absolute numbers sit in the columns beside it. */
function Spark({ values }: { values: number[] }) {
  const peak = Math.max(...values, 1);
  return (
    <div className="flex items-end gap-[1px] h-6" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="w-[3px] rounded-sm bg-accent/70"
          style={{ height: `${Math.max(v === 0 ? 1 : 12, (v / peak) * 100)}%`, opacity: v === 0 ? 0.25 : 1 }}
        />
      ))}
    </div>
  );
}

export function FleetInsights() {
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(14);
  const [sort, setSort] = useState<SortKey>('active');
  const [data, setData] = useState<FleetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiService
      .getFleetInsights(days, sort)
      .then((res) => { if (!cancelled) setData(res); })
      .catch(() => {
        // An empty table with no message reads as "no tenant did anything", which is a very
        // different claim from "we could not load this".
        if (!cancelled) setError('Could not load fleet activity.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [days, sort]);

  const rows = useMemo<FleetClientRow[]>(() => data?.clients ?? [], [data]);

  return (
    <section className="rounded-xl border border-themed surface-card p-6 shadow-glass mb-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="kicker mb-2">Across every client</span>
          <h3 className="serif-display text-[20px] text-text">Who is active, and who is costing</h3>
          <p className="text-xs text-muted mt-1">
            A student counts as active on any day they open the platform. Click a client for the detail.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort clients by"
            className="px-2.5 py-1.5 rounded-lg border border-themed bg-transparent text-xs text-text"
          >
            {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
          <div className="flex gap-1" role="group" aria-label="Time window">
            {WINDOWS.map((w) => (
              <button
                key={w}
                type="button"
                onClick={() => setDays(w)}
                aria-pressed={days === w}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  days === w ? 'bg-accent text-white' : 'border border-themed text-muted hover:text-text'
                }`}
              >
                {w}d
              </button>
            ))}
          </div>
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <Stat icon={<Users size={14} />} label="Active students"
                  value={String(data.totals.active_users)}
                  sub={`across ${data.totals.clients_with_activity} client${data.totals.clients_with_activity === 1 ? '' : 's'}`} />
            <Stat icon={<Coins size={14} />} label="AI spend"
                  value={money(data.totals.cost_usd)}
                  sub={`${data.totals.clients_with_spend} client${data.totals.clients_with_spend === 1 ? '' : 's'} spending`} />
            <Stat label="Tokens" value={compact(data.totals.tokens)} sub={`last ${data.window.days} days`} />
            <Stat label="Platform-level" value={money(data.totals.unowned_cost_usd)}
                  sub="no client attached" />
          </div>

          {data.totals.unowned_cost_usd > 0 && (
            <p className="mb-4 text-xs text-muted flex items-start gap-1.5">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              <span>
                The {money(data.totals.unowned_cost_usd)} platform-level figure
                ({data.totals.unowned_events} calls) is work that belongs to no client — course
                builds, briefings, scheduled jobs. It is deliberately not spread across the
                clients below, which did not incur it.
              </span>
            </p>
          )}

          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">
              No client recorded any activity or spend in this window.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3 font-semibold">Client</th>
                    <th className="py-2 px-3 font-semibold">Trend</th>
                    <th className="py-2 px-3 font-semibold text-right">Active</th>
                    <th className="py-2 px-3 font-semibold text-right">Peak/day</th>
                    <th className="py-2 px-3 font-semibold text-right">Tokens</th>
                    <th className="py-2 px-3 font-semibold text-right">Spend</th>
                    <th className="py-2 pl-3" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => navigate(`/clients/${r.id}`)}
                      className="border-t border-themed/50 cursor-pointer hover:bg-line/[0.03] transition"
                    >
                      <td className="py-2.5 pr-3 min-w-0">
                        <div className="font-medium text-text truncate flex items-center gap-2">
                          {r.name || `Client ${r.id}`}
                          {r.is_active === false && (
                            // A deactivated tenant still shows its numbers - they are real and
                            // often the reason someone is looking - but the state is said.
                            <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600">
                              inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted truncate">{r.slug}</div>
                      </td>
                      <td className="py-2.5 px-3"><Spark values={r.spark} /></td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-text">
                        {r.active_users || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted">
                        {r.peak_day_users || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums text-muted">
                        {r.tokens ? compact(r.tokens) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-text">
                        {r.cost_usd ? money(r.cost_usd) : '—'}
                      </td>
                      <td className="py-2.5 pl-3 text-muted"><ChevronRight size={15} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function Stat({ icon, label, value, sub }: {
  icon?: React.ReactNode; label: string; value: string; sub: string;
}) {
  return (
    <div className="rounded-lg border border-themed p-3 min-w-0">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted uppercase tracking-wide">
        {icon}{label}
      </div>
      <div className="mt-0.5 text-xl font-bold text-text tabular-nums truncate">{value}</div>
      <div className="text-[11px] text-muted truncate">{sub}</div>
    </div>
  );
}

export default FleetInsights;
