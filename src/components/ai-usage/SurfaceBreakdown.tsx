import React from 'react';
import { ChevronRight } from 'lucide-react';

import { AiSurface } from '../../types/aiCostDaily';
import { cn } from '../../utils/helpers';

/**
 * What the money was spent on, and where.
 *
 * The tenant table above answers "who was billed". This answers "for what", which is the half
 * that tells you where to act: "Agileology cost $6.42" and "Agileology spent $6.42 on the
 * tutor" lead to different conversations.
 *
 * Expanding a row shows the tenants under that surface, because a surface's total is rarely
 * the interesting number - one tenant usually dominates it, and that is the thing worth
 * knowing.
 */

const usd = (n: number): string => {
  const v = Number(n || 0);
  const decimals = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

interface Props {
  surfaces: AiSurface[];
}

export const SurfaceBreakdown: React.FC<Props> = ({ surfaces }) => {
  const [open, setOpen] = React.useState<string | null>(null);

  if (!surfaces.length) return null;

  const unlabelled = surfaces.find((s) => s.is_unlabelled) ?? null;
  // The bar is scaled to the biggest surface, not to the total: scaled to the total, every bar
  // but the leader is a sliver and the ranking stops being readable.
  const peak = surfaces.reduce((m, s) => Math.max(m, s.cost_usd), 0);

  return (
    <div className="rounded-2xl border border-themed surface-card p-6">
      <p className="kicker mb-1 text-brand-cyan">Per surface</p>
      <h2 className="mb-1 text-lg font-medium text-text">What the spend went on</h2>
      <p className="mb-4 max-w-3xl text-xs text-text-dim">
        The table above says who was billed. This says for what, and which tenants are behind
        each one. Click a row to see them. Shares are of the whole window, so the column adds
        to 100.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-themed text-left text-xs uppercase tracking-wide text-text-dim">
              <th className="pb-2 pr-4 font-medium">Surface</th>
              <th className="pb-2 pr-4 font-medium">Module</th>
              <th className="pb-2 pr-4 text-right font-medium">Spend</th>
              <th className="pb-2 pr-4 text-right font-medium">Share</th>
              <th className="pb-2 pr-4 text-right font-medium">Calls</th>
              <th className="pb-2 pr-4 text-right font-medium">Tenants</th>
              <th className="pb-2 font-medium">Mostly</th>
            </tr>
          </thead>
          <tbody>
            {surfaces.map((s) => {
              const key = s.feature ?? '__unlabelled__';
              const isOpen = open === key;
              return (
                <React.Fragment key={key}>
                  <tr
                    className={cn(
                      'cursor-pointer border-b border-themed/50 last:border-0 hover:bg-line/[0.03]',
                      s.is_unlabelled && 'text-text-dim',
                    )}
                    onClick={() => setOpen(isOpen ? null : key)}
                  >
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-1.5">
                        <ChevronRight
                          className={cn('h-3.5 w-3.5 shrink-0 transition', isOpen && 'rotate-90')}
                        />
                        <span className={cn(s.is_unlabelled ? 'italic' : 'text-text')}>
                          {s.label}
                        </span>
                      </span>
                      <span className="mt-1 block h-1 max-w-[220px] rounded bg-line/[0.08]">
                        <span
                          className={cn('block h-1 rounded', s.is_unlabelled ? 'bg-text-dim/40' : 'bg-brand-cyan/70')}
                          style={{ width: `${peak > 0 ? Math.max(2, (s.cost_usd / peak) * 100) : 0}%` }}
                        />
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-xs text-text-dim">{s.module_label}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-text">{usd(s.cost_usd)}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{s.share_pct.toFixed(1)}%</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{s.events.toLocaleString()}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-text-dim">{s.client_count}</td>
                    <td className="py-2 text-text-dim">
                      {s.top_client ? (
                        <span className={cn(s.top_client.is_platform && 'italic')}>
                          {s.top_client.client_name}
                          {s.cost_usd > 0 && (
                            <span className="text-text-dim/70">
                              {' '}({Math.round((s.top_client.cost_usd / s.cost_usd) * 100)}%)
                            </span>
                          )}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-themed/50">
                      <td colSpan={7} className="bg-line/[0.02] px-4 py-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-left uppercase tracking-wide text-text-dim">
                              <th className="pb-1 pr-4 font-medium">Tenant</th>
                              <th className="pb-1 pr-4 text-right font-medium">Spend</th>
                              <th className="pb-1 pr-4 text-right font-medium">Tokens</th>
                              <th className="pb-1 text-right font-medium">Calls</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.clients.map((c) => (
                              <tr key={String(c.client_id ?? 'platform')}>
                                <td className={cn('py-1 pr-4', c.is_platform ? 'italic text-text-dim' : 'text-text')}>
                                  {c.client_name}
                                </td>
                                <td className="py-1 pr-4 text-right tabular-nums text-text">{usd(c.cost_usd)}</td>
                                <td className="py-1 pr-4 text-right tabular-nums text-text-dim">{c.tokens.toLocaleString()}</td>
                                <td className="py-1 text-right tabular-nums text-text-dim">{c.events.toLocaleString()}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {s.client_count > s.clients.length && (
                          <p className="mt-2 text-xs text-text-dim">
                            Showing the top {s.clients.length} of {s.client_count} tenants.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {unlabelled && (
        <p className="mt-3 text-xs text-amber-300">
          {usd(unlabelled.cost_usd)} ({unlabelled.share_pct.toFixed(1)}%) has no surface
          recorded, mostly background work that calls the model without naming the surface it is
          serving. It is shown rather than dropped, because leaving it out would make every
          total on this page understate the real bill while looking complete. Closing it means
          labelling those call sites, not hiding the row.
        </p>
      )}
    </div>
  );
};

export default SurfaceBreakdown;
