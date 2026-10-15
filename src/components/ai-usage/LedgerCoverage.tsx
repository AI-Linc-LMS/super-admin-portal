import React from 'react';
import { AlertTriangle, ShieldCheck, Info, ChevronDown } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AiUsageIntegrity, AiUsageIntegrityCheck } from '../../types/aiTokenUsage';

/**
 * The error bar on the headline spend figure.
 *
 * A spend dashboard that shows only what it captured always looks complete, because the spend
 * it missed is invisible by construction. This panel reports the gaps themselves — how much
 * money sits in a bucket nobody can explain — so "$91.02" can be read as a measurement with a
 * known uncertainty rather than as a fact.
 *
 * It deliberately describes the WHOLE ledger and ignores the page filters: a coverage gap that
 * shrank because you picked a narrower month would be worse than showing none at all.
 */

const usd = (n: number): string => {
  const v = Number(n || 0);
  const decimals = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
  return `$${v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

const TONE: Record<string, { ring: string; text: string; dot: string }> = {
  high: { ring: 'border-danger-500/30 bg-danger-500/5', text: 'text-danger-500', dot: 'bg-danger-500' },
  medium: { ring: 'border-warn-500/30 bg-warn-500/5', text: 'text-warn-500', dot: 'bg-warn-500' },
  low: { ring: 'border-themed bg-line/[0.03]', text: 'text-text-dim', dot: 'bg-text-mute' },
  ok: { ring: 'border-themed bg-line/[0.03]', text: 'text-text-dim', dot: 'bg-emerald-500' },
  info: { ring: 'border-themed bg-line/[0.03]', text: 'text-text-dim', dot: 'bg-text-mute' },
};

const CheckRow: React.FC<{ check: AiUsageIntegrityCheck }> = ({ check }) => {
  const tone = TONE[check.severity] ?? TONE.low;
  const extras: string[] = [];
  if (check.models?.length) extras.push(`models: ${check.models.join(', ')}`);
  if (check.features?.length) extras.push(`surfaces: ${check.features.join(', ')}`);
  if (check.first_event) extras.push(`first record: ${check.first_event.slice(0, 10)}`);
  return (
    <div className={`rounded-lg border p-3 ${tone.ring}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tone.dot}`} />
          <div>
            <p className="text-sm font-medium text-text">{check.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-mute">{check.detail}</p>
            {extras.length > 0 && (
              <p className="mt-1 text-[11px] text-text-mute">{extras.join(' · ')}</p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          {check.cost_usd > 0 && (
            <p className={`text-sm font-semibold tabular-nums ${tone.text}`}>
              {usd(check.cost_usd)}
            </p>
          )}
          <p className="text-[11px] tabular-nums text-text-mute">
            {check.rows.toLocaleString()} {check.rows === 1 ? 'row' : 'rows'}
            {typeof check.share_pct === 'number' && check.share_pct > 0
              ? ` · ${check.share_pct}%`
              : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

const LedgerCoverage: React.FC<{ query: UseQueryResult<AiUsageIntegrity> }> = ({ query }) => {
  const [open, setOpen] = React.useState(false);
  const data = query.data;

  // Never block the dashboard on this panel: if the integrity endpoint is unavailable the
  // numbers above are still worth reading, they just come without their error bar.
  if (query.isLoading || query.error || !data) return null;

  const gaps = data.checks.filter((c) => c.severity === 'high' || c.severity === 'medium');
  const clean = gaps.length === 0;
  const unattributed = Math.max(0, data.total_cost_usd - data.attributed_cost_usd);

  return (
    <div className="rounded-xl border border-themed bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <div className="flex items-center gap-3">
          {clean ? (
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 shrink-0 text-warn-500" />
          )}
          <div>
            <p className="text-sm font-medium text-text">
              {clean
                ? 'Every recorded dollar is attributed to a surface'
                : `${usd(unattributed)} of ${usd(data.total_cost_usd)} cannot be attributed to a product area`}
            </p>
            <p className="mt-0.5 text-xs text-text-mute">
              {data.attributed_pct}% of recorded spend is attributed ·{' '}
              {data.total_rows.toLocaleString()} metered calls · {gaps.length}{' '}
              {gaps.length === 1 ? 'gap' : 'gaps'} to review
            </p>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-mute transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-2 border-t border-themed p-4">
          <p className="flex items-start gap-2 text-xs text-text-mute">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Module totals on this page are a <strong>lower bound</strong> while any spend is
              unattributed — the missing money belongs to some module, it just isn’t labelled.
            </span>
          </p>
          {data.checks.map((c) => (
            <CheckRow key={c.key} check={c} />
          ))}
        </div>
      )}
    </div>
  );
};

export default LedgerCoverage;
