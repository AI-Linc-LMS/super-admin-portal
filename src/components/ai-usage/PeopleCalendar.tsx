import React from 'react';
import { AiPeopleDay } from '../../types/aiCostDaily';
import { cn } from '../../utils/helpers';

/**
 * Active people per day, laid out as real calendar months.
 *
 * The line chart beside this answers "is the trend up or down". A calendar answers a different
 * question the line cannot: WHICH day. Weekends, a holiday, the Tuesday a cohort started - those
 * are positions in a month, and on a continuous x axis they are invisible.
 *
 * Built from CSS grid for the same reasons the cost heatmap is: no chart library draws this, and
 * a grid of divs keeps every day a real DOM node that a tooltip and a screen reader can reach.
 *
 * A day with nobody and a day outside the window must not look alike. Days before the window
 * starts are rendered as empty space with no cell at all; days inside it with zero people get a
 * visible flat cell. A gap means "not asked about", a cold cell means "asked, and nobody came".
 */

/** Cold to warm. Index 0 is reserved for exactly zero, so it never shares a colour with 1. */
const STEPS = [
  'bg-line/[0.06] text-text-dim/50',
  'bg-brand-cyan/20 text-text',
  'bg-brand-cyan/35 text-text',
  'bg-brand-cyan/55 text-text',
  'bg-emerald-400/60 text-slate-900',
  'bg-emerald-500/75 text-slate-900',
  'bg-emerald-600/90 text-white',
];

export const peopleStep = (value: number, peak: number): number => {
  if (!value || value <= 0) return 0;
  if (peak <= 0) return 1;
  // Square root, matching the cost heatmap: headcount is skewed too, and a linear ramp leaves
  // every ordinary day the same near-empty colour as a dead one.
  const t = Math.sqrt(value / peak);
  return Math.min(STEPS.length - 1, Math.max(1, Math.ceil(t * (STEPS.length - 1))));
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
/** Monday first: a learning week reads Mon-Fri, and a Sunday-first grid splits the weekend. */
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Parse YYYY-MM-DD as a LOCAL date. `new Date('2026-10-22')` is parsed as UTC and can land on
 *  the previous day west of Greenwich, which would shift every cell by one column. */
const parseLocal = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Monday = 0 ... Sunday = 6. */
const mondayIndex = (date: Date): number => (date.getDay() + 6) % 7;

/** Which population the cells count. Students and staff are never summed into one number:
 *  staff work is not learner demand, and on a cost page conflating them hides who is spending. */
export type PeopleMode = 'users' | 'staff';

interface Props {
  days: AiPeopleDay[];
  mode?: PeopleMode;
  /** Highlighted day, if any. */
  selected?: string | null;
  onSelect?: (date: string | null) => void;
}

export const PeopleCalendar: React.FC<Props> = ({ days, mode = 'users', selected, onSelect }) => {
  // The ramp is scaled to the population on show. Scaling staff against a student peak would
  // paint every staff day the same cold colour, since staff are a fraction of the headcount.
  const peak = React.useMemo(
    () => days.reduce((m, d) => Math.max(m, d[mode]), 0),
    [days, mode],
  );

  // Group into calendar months, preserving the order the window arrived in.
  const months = React.useMemo(() => {
    const out: { key: string; label: string; days: AiPeopleDay[] }[] = [];
    const byKey = new Map<string, { key: string; label: string; days: AiPeopleDay[] }>();
    for (const d of days) {
      const dt = parseLocal(d.date);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      let bucket = byKey.get(key);
      if (!bucket) {
        bucket = { key, label: `${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`, days: [] };
        byKey.set(key, bucket);
        out.push(bucket);
      }
      bucket.days.push(d);
    }
    return out;
  }, [days]);

  if (!days.length) {
    return <p className="text-sm text-text-dim">No days in this window.</p>;
  }

  return (
    <div className="space-y-6">
      <div className={cn('grid gap-6', months.length > 1 ? 'md:grid-cols-2 xl:grid-cols-3' : '')}>
        {months.map((month) => {
          // Blank leaders so the first day of the month sits under its real weekday column.
          const lead = mondayIndex(parseLocal(month.days[0].date));
          return (
            <div key={month.key}>
              <p className="mb-2 text-sm font-medium text-text">{month.label}</p>
              <div className="grid grid-cols-7 gap-1">
                {DOW.map((d) => (
                  <div key={d} className="pb-1 text-center text-[10px] uppercase tracking-wide text-text-dim">
                    {d}
                  </div>
                ))}
                {Array.from({ length: lead }).map((_, i) => (
                  <div key={`lead-${i}`} aria-hidden />
                ))}
                {month.days.map((d) => {
                  const dt = parseLocal(d.date);
                  const value = d[mode];
                  const step = peopleStep(value, peak);
                  const isSelected = selected === d.date;
                  const isPeak = peak > 0 && value === peak;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      onClick={() => onSelect?.(isSelected ? null : d.date)}
                      title={
                        `${d.date}\n` +
                        `${d.users} student${d.users === 1 ? '' : 's'} · ` +
                        `${d.staff} staff\n` +
                        `${d.minutes.toLocaleString()} student min · ` +
                        `${d.learning_minutes.toLocaleString()} learning\n` +
                        `${d.staff_minutes.toLocaleString()} staff min`
                      }
                      aria-label={
                        `${d.date}: ${d.users} active students, ${d.staff} active staff`
                      }
                      aria-pressed={isSelected}
                      className={cn(
                        'flex aspect-square flex-col items-center justify-center rounded-md',
                        'text-[11px] tabular-nums leading-none transition',
                        'focus:outline-none focus:ring-2 focus:ring-brand-cyan/60',
                        STEPS[step],
                        isSelected && 'ring-2 ring-brand-cyan',
                        isPeak && !isSelected && 'ring-1 ring-emerald-300/70',
                      )}
                    >
                      <span className="opacity-60">{dt.getDate()}</span>
                      <span className="font-medium">{value}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-text-dim">
        <span>Fewer</span>
        {STEPS.map((cls, i) => (
          <span key={i} className={cn('h-4 w-5 rounded', cls.split(' ')[0])} aria-hidden />
        ))}
        <span>More</span>
        <span className="ml-2">
          Leftmost swatch is exactly zero, so a quiet day never shares a colour with a day that had one person.
        </span>
      </div>
    </div>
  );
};

export default PeopleCalendar;
