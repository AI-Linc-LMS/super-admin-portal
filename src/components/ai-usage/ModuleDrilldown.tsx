import React from 'react';
import { useAiUsageModule } from '../../hooks/useAiTokenUsage';

/**
 * Everything about one module: which model, which tenant, and the heaviest individual calls.
 *
 * The last table is the one that usually finds the money. A module's bill is rarely uniform —
 * it is a handful of outliers with a runaway prompt — and an average is precisely the statistic
 * that hides them. Showing the twenty dearest calls, with their token split, turns "content
 * generation costs $35" into a specific call you can go and look at.
 *
 * Fetched lazily: the query is disabled until a module is actually expanded, so opening the
 * page costs one request, not eleven.
 */

const usd = (n: number): string => {
  const v = Number(n || 0);
  const decimals = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
  return `$${v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

const compact = (n: number): string =>
  Number(n || 0).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 1 });

const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-lg border border-themed bg-surface p-3">
    <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-text-mute">
      {title}
    </h4>
    {children}
  </div>
);

interface Props {
  moduleKey: string;
  /** The page's window, so the drill-down covers the same period as the row above it. */
  windowUnit: 'days' | 'weeks' | 'months';
  windowValue: number;
  clientId?: number;
}

const ModuleDrilldown: React.FC<Props> = ({ moduleKey, windowUnit, windowValue, clientId }) => {
  const { data, isLoading, error } = useAiUsageModule(moduleKey, {
    [windowUnit]: windowValue,
    ...(clientId !== undefined ? { client_id: clientId } : {}),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-xs text-text-mute">
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
        Loading module detail…
      </div>
    );
  }
  if (error || !data) {
    return <p className="py-3 text-xs text-text-mute">Couldn’t load detail for this module.</p>;
  }

  const t = data.totals;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Panel title="Cost / call">
          <p className="text-sm tabular-nums text-text">{usd(t.cost_per_event)}</p>
        </Panel>
        <Panel title="Tokens / call">
          <p className="text-sm tabular-nums text-text">{compact(t.tokens_per_event)}</p>
        </Panel>
        <Panel title="Prompt cache hit">
          <p className="text-sm tabular-nums text-text">{t.cache_hit_pct}%</p>
        </Panel>
        <Panel title="Output share">
          <p className="text-sm tabular-nums text-text">
            {t.total_tokens > 0
              ? `${Math.round((100 * t.completion_tokens) / t.total_tokens)}%`
              : '—'}
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Panel title="By model">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-themed/50">
              {data.by_model.map((r) => (
                <tr key={r.model}>
                  <td className="py-1 text-text-dim">{r.model}</td>
                  <td className="py-1 text-right tabular-nums text-text-mute">
                    {r.events.toLocaleString()}
                  </td>
                  <td className="py-1 text-right tabular-nums text-text">{usd(r.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="By tenant">
          <table className="w-full text-xs">
            <tbody className="divide-y divide-themed/50">
              {data.by_client.slice(0, 8).map((r) => (
                <tr key={String(r.client_id ?? 'platform')}>
                  <td className="py-1 text-text-dim">{r.client_name}</td>
                  <td className="py-1 text-right tabular-nums text-text-mute">
                    {r.events.toLocaleString()}
                  </td>
                  <td className="py-1 text-right tabular-nums text-text">{usd(r.cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <Panel title="Heaviest individual calls">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-xs">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-text-mute">
                <th className="pb-1 font-medium">When</th>
                <th className="pb-1 font-medium">Surface</th>
                <th className="pb-1 font-medium">Model</th>
                <th className="pb-1 text-right font-medium">In / out</th>
                <th className="pb-1 text-right font-medium">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-themed/50">
              {data.top_calls.map((c) => (
                <tr key={c.id}>
                  <td className="py-1 whitespace-nowrap text-text-mute">
                    {c.created_at.slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="py-1 text-text-dim">{c.surface_label}</td>
                  <td className="py-1 text-text-mute">{c.model}</td>
                  <td className="py-1 text-right tabular-nums text-text-mute">
                    {compact(c.prompt_tokens)} / {compact(c.completion_tokens)}
                  </td>
                  <td className="py-1 text-right tabular-nums text-text">{usd(c.cost_usd)}</td>
                </tr>
              ))}
              {data.top_calls.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-2 text-center text-text-mute">
                    No calls in this window.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

export default ModuleDrilldown;
