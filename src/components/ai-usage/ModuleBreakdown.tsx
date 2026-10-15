import React from 'react';
import { ChevronDown, Layers } from 'lucide-react';
import type { AiUsageByModule } from '../../types/aiTokenUsage';

/**
 * Spend by product module, with the surfaces that make it up nested beneath.
 *
 * The three numbers on the right are the ones that change a decision. Cost alone cannot tell
 * you what to do about a module: 8,556 code-mentor calls at $0.0007 and 246 tutor calls at
 * $0.0335 are different problems, and only the per-call figures separate "busy" from
 * "expensive". The cache column is the lever — prompt-cached input is billed at a fraction of
 * the rate, so a heavy module with a low cache rate is usually the cheapest thing to fix.
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

interface Props {
  modules: AiUsageByModule[];
  openModule: string | null;
  onToggle: (key: string) => void;
  renderDetail: (key: string) => React.ReactNode;
}

const ModuleBreakdown: React.FC<Props> = ({ modules, openModule, onToggle, renderDetail }) => {
  const total = modules.reduce((sum, m) => sum + m.cost_usd, 0);

  if (modules.length === 0) {
    return (
      <div className="rounded-xl border border-themed bg-surface p-8 text-center text-sm text-text-mute">
        No metered AI calls in this window.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-themed bg-surface">
      <div className="flex items-center gap-2 border-b border-themed px-4 py-3">
        <Layers className="h-3.5 w-3.5 text-text-mute" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-dim">
          By module
        </h3>
        <span className="ml-auto text-xs text-text-mute">
          {modules.length} modules · {usd(total)}
        </span>
      </div>

      <div className="divide-y divide-themed">
        {modules.map((m) => {
          const share = total > 0 ? (100 * m.cost_usd) / total : 0;
          const isOpen = openModule === m.module;
          // The two buckets that are metering gaps rather than product areas are marked, so
          // nobody reads "Unattributed" as a feature somebody can go and optimise.
          const isGap = m.module === 'unlabelled' || m.module === 'unmapped';
          return (
            <div key={m.module}>
              <button
                type="button"
                onClick={() => onToggle(m.module)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-line/[0.03]"
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-text-mute transition-transform ${
                    isOpen ? 'rotate-180' : '-rotate-90'
                  }`}
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-text">{m.module_label}</p>
                    {isGap && (
                      <span className="shrink-0 rounded border border-warn-500/30 bg-warn-500/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-warn-500">
                        metering gap
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-text-mute">{m.blurb}</p>
                  <div className="mt-1.5 h-1 w-full max-w-xs overflow-hidden rounded-full bg-line/10">
                    <div
                      className={`h-full rounded-full ${isGap ? 'bg-warn-500/60' : 'bg-brand-cyan/70'}`}
                      style={{ width: `${Math.max(1, share)}%` }}
                    />
                  </div>
                </div>

                <dl className="hidden shrink-0 gap-6 text-right sm:flex">
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-text-mute">Calls</dt>
                    <dd className="text-sm tabular-nums text-text-dim">{compact(m.events)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-text-mute">$/call</dt>
                    <dd className="text-sm tabular-nums text-text-dim">{usd(m.cost_per_event)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-wider text-text-mute">Cached</dt>
                    <dd className="text-sm tabular-nums text-text-dim">{m.cache_hit_pct}%</dd>
                  </div>
                </dl>

                <div className="w-24 shrink-0 text-right">
                  <p className="text-sm font-semibold tabular-nums text-text">{usd(m.cost_usd)}</p>
                  <p className="text-[11px] tabular-nums text-text-mute">{share.toFixed(1)}%</p>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-themed bg-line/[0.02] px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wider text-text-mute">
                        <th className="pb-2 font-medium">Surface</th>
                        <th className="pb-2 text-right font-medium">Calls</th>
                        <th className="pb-2 text-right font-medium">Tokens</th>
                        <th className="pb-2 text-right font-medium">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-themed/50">
                      {m.surfaces.map((s) => (
                        <tr key={s.feature}>
                          <td className="py-1.5 text-text-dim">{s.surface_label}</td>
                          <td className="py-1.5 text-right tabular-nums text-text-mute">
                            {s.events.toLocaleString()}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-text-mute">
                            {compact(s.total_tokens)}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-text-dim">
                            {usd(s.cost_usd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3">{renderDetail(m.module)}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ModuleBreakdown;
