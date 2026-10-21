import React from 'react';
import { AiCostClientRow } from '../../types/aiCostDaily';
import { cn } from '../../utils/helpers';

/**
 * Daily AI spend as a tenant x day grid.
 *
 * Built from CSS grid rather than a chart library: recharts has no heatmap, and a grid of divs
 * is crisper at this density, keeps every cell a real DOM node a screen reader and a tooltip can
 * reach, and costs no new dependency.
 *
 * The scale is SQUARE ROOT, not linear. Spend is wildly skewed - on production the hottest cell
 * is $2.47 while the median active cell is under five cents - and a linear ramp paints all but
 * two or three cells the same near-empty colour, which is the failure mode that makes a heatmap
 * decorative. The root compresses the top and opens out the bottom so an ordinary day is still
 * visibly warmer than a quiet one.
 *
 * A day with NO spend and a day with a few cents must not look the same, so zero gets its own
 * flat treatment rather than being the bottom of the ramp.
 */

/** Cold to hot. Index 0 is reserved for exactly zero. */
const STEPS = [
  'bg-line/[0.06]',                 // 0: nothing happened
  'bg-brand-cyan/20',
  'bg-brand-cyan/35',
  'bg-brand-cyan/55',
  'bg-amber-400/60',
  'bg-orange-500/70',
  'bg-rose-500/80',                 // the day someone should ask about
];

export const costStep = (value: number, peak: number): number => {
  if (!value || value <= 0) return 0;
  if (peak <= 0) return 1;
  // sqrt ramp; always at least step 1 so any real spend is visible
  const t = Math.sqrt(value / peak);
  return Math.min(STEPS.length - 1, Math.max(1, Math.ceil(t * (STEPS.length - 1))));
};

const usd = (n: number): string => {
  const v = Number(n || 0);
  const decimals = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};

const dayLabel = (iso: string): string =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

interface Props {
  dates: string[];
  clients: AiCostClientRow[];
  /** The hottest single cell in the window; the scale is relative to it. */
  peak: number;
  onPickClient?: (clientId: number | null) => void;
}

export const CostHeatmap: React.FC<Props> = ({ dates, clients, peak, onPickClient }) => {
  if (!clients.length) {
    return (
      <p className="py-10 text-center text-sm text-text-dim">
        No AI spend in this window.
      </p>
    );
  }

  // Label only a few columns. One label per day is unreadable past about a fortnight, and
  // rotating them to fit is worse than showing fewer.
  const every = dates.length <= 14 ? 1 : dates.length <= 40 ? 7 : 14;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* column headers */}
        <div
          className="mb-1 grid items-end gap-[2px] pl-[172px] text-[10px] text-text-dim"
          style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(6px, 1fr))` }}
        >
          {dates.map((d, i) => (
            <span key={d} className="whitespace-nowrap">
              {i % every === 0 ? dayLabel(d) : ''}
            </span>
          ))}
        </div>

        {clients.map((row) => (
          <div key={String(row.client_id)} className="mb-[2px] flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPickClient?.(row.client_id)}
              title={row.client_name}
              className={cn(
                'w-[164px] shrink-0 truncate rounded px-1 py-0.5 text-left text-xs',
                'hover:bg-line/[0.06] focus:outline-none focus:ring-1 focus:ring-brand-cyan/50',
                row.is_platform ? 'italic text-text-dim' : 'text-text',
              )}
            >
              {row.client_name}
            </button>
            <div
              className="grid flex-1 gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${dates.length}, minmax(6px, 1fr))` }}
            >
              {row.cells.map((cell) => (
                <div
                  key={cell.date}
                  // The title is the whole tooltip. Every cell carries its own numbers because a
                  // colour alone cannot be read back as a value, and the grid is too dense for
                  // labels.
                  title={`${row.client_name}\n${cell.date}\n${usd(cell.cost_usd)} · ${cell.events.toLocaleString()} calls · ${cell.tokens.toLocaleString()} tokens`}
                  className={cn('h-4 rounded-[2px]', STEPS[costStep(cell.cost_usd, peak)])}
                />
              ))}
            </div>
          </div>
        ))}

        {/* legend */}
        <div className="mt-4 flex items-center gap-2 pl-[172px] text-[10px] text-text-dim">
          <span>none</span>
          {STEPS.map((cls, i) => (
            <span key={i} className={cn('h-3 w-5 rounded-[2px]', cls)} />
          ))}
          <span>{usd(peak)} / day</span>
        </div>
      </div>
    </div>
  );
};

export default CostHeatmap;
