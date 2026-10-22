import React from 'react';
import { motion } from 'framer-motion';
import { Coins, Flame, Users } from 'lucide-react';

import AiTokenUsage from './AiTokenUsage';
import AiCostDaily from './AiCostDaily';
import PeoplePanel from '../components/ai-usage/PeoplePanel';
import { cn } from '../utils/helpers';

/**
 * One module over the AI usage ledger.
 *
 * There were two pages here, "AI Token Usage" and "Daily AI Cost", and they read the SAME
 * table through two endpoints. Two surfaces over one dataset is how numbers drift and how
 * people end up arguing about which page is right, and neither of them could answer the
 * question most often asked of either: who spent this.
 *
 * So they are tabs now, not pages, and a third tab answers the who. The old routes redirect
 * here rather than 404, because they are in people's bookmarks and in the sidebar muscle
 * memory.
 *
 * The tabs keep their own window controls on purpose. They are not the same control: the
 * summary endpoint buckets by month and accepts two years, while the daily matrix is capped
 * at 180 days because a longer heatmap stops being readable before the query stops being
 * cheap. Forcing one control over both would mean losing a capability on each side.
 */

type TabKey = 'overview' | 'daily' | 'people';

const TABS: { key: TabKey; label: string; icon: React.ElementType; blurb: string }[] = [
  { key: 'overview', label: 'Spend & tokens', icon: Coins,
    blurb: 'Totals, trend, and the breakdown by client, model and module.' },
  { key: 'daily', label: 'By day & tenant', icon: Flame,
    blurb: 'Which tenant spent what, on which day.' },
  { key: 'people', label: 'People', icon: Users,
    blurb: 'Who was on the platform, who spent, and for which client.' },
];

/** Matches the daily matrix cap. The People tab reads that endpoint. */
const WINDOWS = [
  { label: 'Last 14 days', value: 14 },
  { label: 'Last 30 days', value: 30 },
  { label: 'Last 60 days', value: 60 },
  { label: 'Last 90 days', value: 90 },
  { label: 'Last 180 days', value: 180 },
];

const AiUsage: React.FC = () => {
  const [tab, setTab] = React.useState<TabKey>('overview');
  const [peopleDays, setPeopleDays] = React.useState<number>(30);
  // An explicit range, used only when BOTH ends are set. A half-filled picker keeps showing
  // the rolling window rather than blanking the page while somebody types the second date.
  const [from, setFrom] = React.useState<string>('');
  const [to, setTo] = React.useState<string>('');

  const peopleParams = React.useMemo(
    () => (from && to ? { days: peopleDays, start: from, end: to } : { days: peopleDays }),
    [peopleDays, from, to],
  );
  const ranged = Boolean(from && to);
  // One object, shared by all three tabs. Null unless BOTH ends are set, so a half-filled
  // picker leaves every tab on its own preset rather than blanking the module mid-edit.
  const globalRange = React.useMemo(
    () => (from && to ? { start: from, end: to } : null),
    [from, to],
  );

  const active = TABS.find((t) => t.key === tab) ?? TABS[0];

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-themed surface-card p-7"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-cyan/10 blur-3xl"
        />
        <p className="kicker mb-2 flex items-center gap-2 text-brand-cyan">
          <Coins className="h-3.5 w-3.5" /> AI Usage · Every tenant
        </p>
        <h1 className="serif-display text-[32px] font-medium leading-tight text-text">
          AI Usage
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-text-dim">
          One ledger, three questions: how much, by whom, and on which day. {active.blurb}
        </p>
      </motion.div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-themed p-3">
        <span className="text-xs uppercase tracking-wide text-text-dim">Date range</span>
        <input
          type="date"
          className="rounded-lg border border-themed bg-line/[0.03] px-3 py-2 text-sm text-text focus:border-brand-cyan/50 focus:outline-none"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          aria-label="From date"
        />
        <span className="text-xs text-text-dim">to</span>
        <input
          type="date"
          className="rounded-lg border border-themed bg-line/[0.03] px-3 py-2 text-sm text-text focus:border-brand-cyan/50 focus:outline-none"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          aria-label="To date"
        />
        {(from || to) && (
          <button
            type="button"
            onClick={() => { setFrom(''); setTo(''); }}
            className="rounded-lg border border-themed px-3 py-2 text-sm text-text-dim hover:text-text"
          >
            Clear
          </button>
        )}
        {ranged ? (
          <span className="text-xs text-brand-cyan">
            Applied to all three tabs. Each tab&apos;s own window picker is disabled while this
            is set.
          </span>
        ) : from || to ? (
          <span className="text-xs text-amber-300">
            Pick both ends. Until then each tab uses its own window.
          </span>
        ) : (
          <span className="text-xs text-text-dim">
            Optional. Leave it empty and each tab keeps its own window.
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-themed p-1" role="tablist">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition',
              tab === key
                ? 'bg-brand-cyan/15 text-brand-cyan'
                : 'text-text-dim hover:text-text',
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <AiTokenUsage embedded range={globalRange} />}
      {tab === 'daily' && <AiCostDaily embedded range={globalRange} />}
      {tab === 'people' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <select
              className={cn(
                'rounded-lg border border-themed bg-line/[0.03] px-3 py-2 text-sm focus:border-brand-cyan/50 focus:outline-none',
                ranged ? 'text-text-dim' : 'text-text',
              )}
              value={peopleDays}
              onChange={(e) => setPeopleDays(Number(e.target.value))}
              aria-label="Window"
              disabled={ranged}
              title={ranged ? 'A date range is set for the whole module' : undefined}
            >
              {WINDOWS.map((w) => (
                <option key={w.value} value={w.value}>{w.label}</option>
              ))}
            </select>
          </div>
          <PeoplePanel params={peopleParams} />
        </div>
      )}
    </div>
  );
};

export default AiUsage;
