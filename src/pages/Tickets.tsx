import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  Inbox,
  LifeBuoy,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  UserPlus,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import TicketAttachmentViewer from '../components/tickets/TicketAttachmentViewer';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
  useAssignTicket,
  useResolveTicket,
  useSetTicketStatus,
  useTicketAssignees,
  useTicketStats,
  useTickets,
} from '../hooks/useTickets';
import {
  personName,
  readPager,
  TICKET_CATEGORIES,
  TICKET_PAGE_SIZES,
  Ticket,
  TicketFilters,
  TicketStatus,
} from '../types/ticket';
import { cn, formatDate } from '../utils/helpers';
import {
  greetingName,
  mailtoHref,
  telFromContact,
  ticketChatMessage,
  whatsappChatUrl,
} from '../utils/ticketContact';

/* ------------------------------------------------------------------------------------------------
 * Chips.
 *
 * One vocabulary, borrowed wholesale from Clients.tsx (PaymentCell / ActivityCell / StatusPill):
 * a rounded-full mono micro-caps pill in a 10%-tinted token colour. This page used to invent its
 * own at three different sizes and weights, in colour classes (`text-muted-foreground`,
 * `bg-primary`, `border-border`) that this Tailwind config does not define at all, so they emitted
 * no CSS: the "selected" status tab looked identical to the unselected ones and every card sat on
 * a transparent surface with a stray light-grey default border that ignored the theme.
 * ---------------------------------------------------------------------------------------------- */

const CHIP =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2';

/**
 * OPEN is amber and so is the unassigned chip, deliberately.
 *
 * They live in different columns and mean two halves of the same thing: this one still needs
 * someone, and nobody has it. A row wearing both is the top of the triage pile and reads that way
 * at a glance. In progress takes the brand accent (somebody is on it) and resolved takes emerald,
 * the same "good terminal state" green StatusPill uses for an active tenant.
 */
const STATUS_TONE: Record<TicketStatus, string> = {
  OPEN: 'border-amber-500/30 bg-amber-500/10 text-amber-500',
  IN_PROGRESS: 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan',
  RESOLVED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
};

const StatusChip: React.FC<{ ticket: Ticket }> = ({ ticket }) => (
  <span className={cn(CHIP, STATUS_TONE[ticket.status])}>
    {ticket.status_display || ticket.status}
  </span>
);

const ReopenedChip: React.FC = () => (
  <span
    className={cn(CHIP, 'border-violet-500/30 bg-violet-500/10 text-violet-400')}
    title="Closed once and raised again. Worth reading the resolution that did not hold."
  >
    <RotateCcw className="h-2.5 w-2.5" />
    Reopened
  </span>
);

/* ------------------------------------------------------------------------------------------------
 * Time.
 *
 * The list shows age and only age, with the real timestamp on hover; the detail panel shows
 * absolute dates through the portal's shared formatDate. That split is the rule rather than an
 * accident: a queue is read by "how long has this been sitting", and mixing "2h ago" with
 * "Aug 14, 2026" down one column is what made this page feel arbitrary.
 * ---------------------------------------------------------------------------------------------- */

function ageLabel(iso?: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 365) return `${days}d`;
  return `${Math.floor(days / 365)}y`;
}

/** Absolute timestamp for a title attribute, or undefined so no empty tooltip is attached. */
function stamp(iso?: string | null): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? undefined : d.toLocaleString();
}

/** Anything older than this has been waiting long enough to be called out in the queue. */
const STALE_DAYS = 7;

function isStale(ticket: Ticket): boolean {
  if (ticket.status === 'RESOLVED' || !ticket.created_at) return false;
  const ms = Date.now() - new Date(ticket.created_at).getTime();
  return !Number.isNaN(ms) && ms > STALE_DAYS * 86400000;
}

/* ------------------------------------------------------------------------------------------------
 * Query state.
 * ---------------------------------------------------------------------------------------------- */

interface QueueQuery {
  status: TicketFilters['status'];
  category: string;
  clientId?: number;
  unassignedOnly: boolean;
  reopenedOnly: boolean;
  search: string;
  page: number;
  pageSize: number;
}

const INITIAL_QUERY: QueueQuery = {
  status: undefined,
  category: '',
  clientId: undefined,
  unassignedOnly: false,
  reopenedOnly: false,
  search: '',
  page: 1,
  pageSize: 25,
};

const TABS: { value: TicketFilters['status']; label: string; countKey: string }[] = [
  { value: undefined, label: 'Needs someone', countKey: 'needs' },
  { value: 'OPEN', label: 'Open', countKey: 'open' },
  { value: 'IN_PROGRESS', label: 'In progress', countKey: 'in_progress' },
  { value: 'RESOLVED', label: 'Resolved', countKey: 'resolved' },
  { value: 'all', label: 'All', countKey: 'total' },
];

const SELECT_CLASS =
  'h-10 appearance-none rounded-lg border border-themed-2 bg-ink-1/60 pl-3 pr-9 text-[14px] ' +
  'text-text transition-colors focus:outline-none focus:border-brand-cyan/40 focus:bg-ink-1/90 ' +
  'focus:shadow-[0_0_0_3px_rgba(0,224,255,0.10)] disabled:cursor-not-allowed disabled:opacity-50';

/** The portal's select, chevron and all. Same shell as the two on Clients.tsx. */
const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  title?: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ value, onChange, title, disabled, className, children }) => (
  <div className={cn('relative', className)}>
    <select
      value={value}
      title={title}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className={cn(SELECT_CLASS, 'w-full')}
    >
      {children}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
  </div>
);

const MicroLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={cn(
      'font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute',
      className
    )}
  >
    {children}
  </span>
);

/**
 * Every institution's support tickets in one queue.
 *
 * A super admin could always SEE that a tenant had tickets; acting on one meant signing in as
 * that tenant's admin. This is the same worklist with the same actions, across all of them.
 *
 * It opens on what still needs someone rather than on everything ever raised: a queue that starts
 * with years of resolved tickets is a report.
 *
 * The API pages at 25 rows and has always accepted `page`, but this screen had no pager, so ticket
 * 26 onwards was unreachable from the portal no matter how the operator filtered. That is the bug
 * this rewrite exists for; the rest is making the page legible enough to triage in.
 */
const Tickets: React.FC = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState<QueueQuery>(INITIAL_QUERY);
  // Kept apart from `query.search` so typing does not fire a request per keystroke. The debounce
  // below is what promotes it into the query.
  const [searchInput, setSearchInput] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  /**
   * Every filter change routes through here and resets to page 1.
   *
   * Not done in an effect on purpose. An effect would let one request go out for (new filter, old
   * page) before the reset landed, and narrowing a filter while on page 4 would flash an empty
   * queue. The server clamps that case too now, but the FE must not depend on the server to avoid
   * showing the operator a blank list and letting them conclude the tickets are gone.
   */
  const setFilter = (patch: Partial<QueueQuery>) => {
    setQuery((q) => ({ ...q, ...patch, page: 1 }));
    setOpenId(null);
  };
  const goToPage = (page: number) => {
    setQuery((q) => ({ ...q, page }));
    // The expanded row belongs to the page being left. Collapsing avoids a detail panel hanging
    // open under a table that no longer contains its ticket.
    setOpenId(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuery((q) => (q.search === searchInput ? q : { ...q, search: searchInput, page: 1 }));
    }, 300);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const filters: TicketFilters = useMemo(
    () => ({
      status: query.status,
      category: query.category || undefined,
      clientId: query.clientId,
      assignedTo: query.unassignedOnly ? 'unassigned' : undefined,
      search: query.search.trim() || undefined,
      reopened: query.reopenedOnly || undefined,
      page: query.page,
      pageSize: query.pageSize,
    }),
    [query]
  );

  const { data, isLoading, isFetching, isPreviousData, error, refetch } = useTickets(filters);
  const { data: stats } = useTicketStats();

  const rows = data?.results ?? [];
  const counts = data?.counts;
  const pager = readPager(data);

  /**
   * Follow the server when it clamps.
   *
   * `page` in the response is the page actually served, and it is capped at the last page. If the
   * operator is on page 9 of a set that just shrank to 3, the state has to come back to 3 or the
   * pager keeps printing "Page 9 of 3" over page-3 rows and the next/prev buttons act on a page
   * number nobody is on. Guarded on inequality, so it settles in one step.
   */
  const servedPage = data?.page;
  useEffect(() => {
    // isPreviousData is load-bearing, not a nicety. keepPreviousData means `data` is still the
    // PREVIOUS page's response while the next one is in flight, so syncing unconditionally would
    // read page 1 off the old payload the instant the operator clicked through to page 2 and yank
    // them straight back. Only a response that belongs to the current query may move the pointer.
    if (isPreviousData || isFetching) return;
    if (servedPage && servedPage !== query.page) {
      setQuery((q) => (q.page === servedPage ? q : { ...q, page: servedPage }));
    }
  }, [servedPage, query.page, isPreviousData, isFetching]);

  const needs = counts ? counts.open + counts.in_progress : 0;
  const countFor = (key: string): number => {
    if (!counts) return 0;
    if (key === 'needs') return needs;
    return (counts as unknown as Record<string, number>)[key] ?? 0;
  };

  // "Has the operator narrowed anything?" The default status tab counts, because the default view
  // is itself a filter (the API excludes resolved unless asked), and an empty screen there means
  // something different from an empty screen with no filter at all.
  const narrowed =
    query.status !== undefined ||
    !!query.category ||
    query.clientId !== undefined ||
    query.unassignedOnly ||
    query.reopenedOnly ||
    !!query.search.trim();

  const clearFilters = () => {
    setSearchInput('');
    setQuery(INITIAL_QUERY);
    setOpenId(null);
  };

  // Institutions come from the stats endpoint, which lists every tenant that has ever filed a
  // ticket. The tiles below only show the eight busiest; this picker is how the other ninety are
  // reachable, and it is sorted by name because it is read as a list rather than a leaderboard.
  const institutions = useMemo(
    () =>
      [...(stats?.by_client ?? [])].sort((a, b) =>
        (a.client_name || '').localeCompare(b.client_name || '')
      ),
    [stats]
  );
  const selectedInstitution = institutions.find((c) => c.client_id === query.clientId);

  // First paint only. Once a page has landed, keepPreviousData holds it on screen and the table
  // dims instead of collapsing back into a skeleton on every next-page click.
  const firstLoad = isLoading && !data;
  // Dimmed only while the rows on screen belong to a DIFFERENT query than the one being asked.
  // Not on every background refetch: refetchOnWindowFocus fires one every time the operator comes
  // back to the tab, and a table that greys out each time reads as a page that keeps breaking.
  const stale = isPreviousData;

  return (
    <div className="space-y-6">
      {/*
        A failed request is not an empty queue. This portal has shipped that confusion before (the
        client list rendered three invented tenants on a 403), so the banner states it in words and
        the table below is gated on the same flag.
      */}
      {!!error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-danger-500/30 bg-danger-500/[0.06] px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger-500" />
          <div className="flex-1 text-[13px] leading-relaxed text-text-dim">
            <MicroLabel className="text-danger-500">{t('common.error')}</MicroLabel>
            <span className="ml-2">
              {t('tickets.loadFailed', {
                defaultValue:
                  'Could not load the ticket queue. Nothing below is missing because it was resolved; the request failed.',
              })}
            </span>
            {!!data && (
              <span className="ml-1 text-text-mute">
                {t('tickets.showingStale', {
                  defaultValue: 'The rows on screen are from the last successful load.',
                })}
              </span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            {t('common.tryAgain')}
          </Button>
        </motion.div>
      )}

      {/* Hero header */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span className="kicker mb-3">
            <LifeBuoy className="mr-2 h-3 w-3" />
            {t('tickets.kicker', { defaultValue: 'Support' })}
          </span>
          <h1 className="serif-display text-[40px] leading-[1.05] text-text">
            {t('tickets.titleLead', { defaultValue: 'Support' })}{' '}
            <span className="gradient-text">
              {t('tickets.titleAccent', { defaultValue: 'queue' })}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-dim">
            {t('tickets.subtitle', {
              defaultValue:
                'Every institution in one worklist. Resolving a ticket emails the person who raised it, exactly as their own admin would, and assigning one emails whoever you hand it to.',
            })}
          </p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />}
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {t('common.refresh', { defaultValue: 'Refresh' })}
        </Button>
      </motion.section>

      {/* Where the load is. The point of a cross-tenant queue is seeing WHICH tenant is on fire. */}
      {stats && stats.by_client.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.04 }}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          {stats.by_client.slice(0, 8).map((c) => {
            const selected = query.clientId === c.client_id;
            return (
              <button
                key={c.client_id}
                type="button"
                onClick={() =>
                  setFilter({ clientId: selected ? undefined : c.client_id })
                }
                className={cn(
                  'rounded-xl border surface-card p-4 text-left shadow-glass transition-all duration-200',
                  selected
                    ? 'border-brand-cyan/50 shadow-glow'
                    : 'border-themed hover:-translate-y-0.5 hover:border-brand-cyan/30'
                )}
              >
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-text-mute" strokeWidth={1.75} />
                  <span
                    className={cn(
                      'truncate text-[13px] font-medium',
                      selected ? 'text-brand-cyan' : 'text-text'
                    )}
                    title={c.client_name}
                  >
                    {c.client_name}
                  </span>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="serif-num text-[26px] leading-none text-text">
                    {c.open + c.in_progress}
                  </span>
                  <MicroLabel>{t('tickets.needSomeone', { defaultValue: 'need someone' })}</MicroLabel>
                </div>
                <div className="mt-2 h-[18px]">
                  {c.unassigned > 0 && (
                    <span className={cn(CHIP, 'border-amber-500/30 bg-amber-500/10 text-amber-500')}>
                      {c.unassigned} unassigned
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </motion.section>
      )}

      {/* Status tabs. Segmented, one shape, and the selected one is now actually distinguishable:
          it used to be painted with bg-primary, a class this Tailwind config never defines. */}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((tab) => {
          const active = query.status === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setFilter({ status: tab.value })}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
                active
                  ? 'border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan shadow-[inset_0_0_0_1px_rgba(0,224,255,0.18)]'
                  : 'border-themed-2 text-text-dim hover:border-brand-cyan/25 hover:text-text'
              )}
            >
              {tab.label}
              {/* Platform-wide, never scoped to the current filter: tabs that renumber themselves
                  as you click them cannot tell you how much work is left. */}
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                  active ? 'bg-brand-cyan/15 text-brand-cyan' : 'bg-line/[0.08] text-text-mute'
                )}
              >
                {countFor(tab.countKey)}
              </span>
            </button>
          );
        })}

        <span className="mx-1 hidden h-5 w-px bg-line/20 sm:block" aria-hidden />

        <button
          type="button"
          onClick={() => setFilter({ unassignedOnly: !query.unassignedOnly })}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
            query.unassignedOnly
              ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
              : 'border-themed-2 text-text-dim hover:border-amber-500/25 hover:text-text'
          )}
        >
          <UserPlus className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t('tickets.unassignedOnly', { defaultValue: 'Unassigned only' })}
          {counts && (
            <span
              className={cn(
                'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                query.unassignedOnly
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-line/[0.08] text-text-mute'
              )}
            >
              {counts.unassigned}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter({ reopenedOnly: !query.reopenedOnly })}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-[13px] font-medium transition-colors',
            query.reopenedOnly
              ? 'border-violet-500/40 bg-violet-500/10 text-violet-400'
              : 'border-themed-2 text-text-dim hover:border-violet-500/25 hover:text-text'
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
          {t('tickets.reopenedOnly', { defaultValue: 'Reopened only' })}
        </button>
      </div>

      {/* Filter bar. Same shell as the one on Clients.tsx. */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="relative overflow-hidden rounded-xl border border-themed surface-card p-4 shadow-glass"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/15 to-transparent"
        />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              leftIcon={<Search className="h-4 w-4" />}
              placeholder={t('tickets.searchPlaceholder', {
                defaultValue: 'Search subject, description, reporter or institution',
              })}
            />
          </div>

          <Select
            value={query.clientId ? String(query.clientId) : ''}
            onChange={(v) => setFilter({ clientId: v ? Number(v) : undefined })}
            className="lg:w-56"
          >
            <option value="">
              {t('tickets.allInstitutions', { defaultValue: 'All institutions' })}
            </option>
            {institutions.map((c) => (
              <option key={c.client_id} value={c.client_id}>
                {c.client_name} ({c.open + c.in_progress})
              </option>
            ))}
          </Select>

          <Select
            value={query.category}
            onChange={(v) => setFilter({ category: v })}
            className="lg:w-48"
          >
            <option value="">
              {t('tickets.allCategories', { defaultValue: 'All categories' })}
            </option>
            {TICKET_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>

          <Select
            value={String(query.pageSize)}
            onChange={(v) => setFilter({ pageSize: Number(v) })}
            title="Rows per page. The API caps this at 100."
            className="lg:w-32"
          >
            {TICKET_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </Select>
        </div>

        {narrowed && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-themed pt-3">
            <MicroLabel>{t('tickets.filtering', { defaultValue: 'Filtering' })}</MicroLabel>
            {selectedInstitution && (
              <span className={cn(CHIP, 'border-themed-2 bg-line/[0.06] text-text-dim')}>
                {selectedInstitution.client_name}
              </span>
            )}
            {query.category && (
              <span className={cn(CHIP, 'border-themed-2 bg-line/[0.06] text-text-dim')}>
                {TICKET_CATEGORIES.find((c) => c.value === query.category)?.label ?? query.category}
              </span>
            )}
            {query.search.trim() && (
              <span className={cn(CHIP, 'border-themed-2 bg-line/[0.06] text-text-dim')}>
                &ldquo;{query.search.trim()}&rdquo;
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              {t('tickets.clearFilters', { defaultValue: 'Clear all filters' })}
            </Button>
          </div>
        )}
      </motion.section>

      {/* Body */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        {firstLoad ? (
          <TableShell>
            <TableHead />
            <tbody>
              {Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-themed last:border-b-0">
                  <td colSpan={7} className="px-5 py-4">
                    <div className="h-4 w-full animate-pulse rounded bg-line/[0.08]" />
                  </td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        ) : error && !data ? (
          /* Failure, said as failure. No Inbox icon and no "nothing waiting" copy, because those
             are the words for an empty queue and this is not one. */
          <EmptyPanel
            icon={AlertTriangle}
            tone="danger"
            title={t('tickets.errorTitle', { defaultValue: 'The queue could not be loaded' })}
            body={t('tickets.errorBody', {
              defaultValue:
                'This is a failed request, not an empty queue. Tickets may well be waiting behind it.',
            })}
            action={
              <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
                {t('common.tryAgain')}
              </Button>
            }
          />
        ) : rows.length === 0 && counts && counts.total === 0 ? (
          /* Genuinely nothing, ever. Tested BEFORE the filter case on purpose: `counts` is
             platform-wide and ignores filters, so zero there means zero everywhere, and telling an
             operator to widen their filters would send them hunting for tickets that do not exist.
             This is the only state allowed to claim the platform has no tickets. */
          <EmptyPanel
            icon={Inbox}
            title={t('tickets.noneEverTitle', { defaultValue: 'No tickets have ever been raised' })}
            body={t('tickets.noneEverBody', {
              defaultValue: 'No institution on the platform has filed a support ticket yet.',
            })}
          />
        ) : rows.length === 0 && narrowed ? (
          /* Filtered to nothing. The tickets exist; these filters just do not reach them. */
          <EmptyPanel
            icon={SearchX}
            title={t('tickets.noMatchTitle', { defaultValue: 'No tickets match these filters' })}
            body={t('tickets.noMatchBody', {
              defaultValue:
                'The queue is not empty. Widen or clear the filters to see what is in it.',
            })}
            action={
              <Button variant="outline" size="sm" onClick={clearFilters}>
                {t('tickets.clearFilters', { defaultValue: 'Clear all filters' })}
              </Button>
            }
          />
        ) : rows.length === 0 ? (
          /* Queue clear. Different from the two above: work HAS been done, it is all resolved. */
          <EmptyPanel
            icon={CheckCircle2}
            tone="good"
            title={t('tickets.clearTitle', { defaultValue: 'Nothing needs someone' })}
            body={t('tickets.clearBody', {
              defaultValue:
                'Every ticket across every institution is resolved. The resolved ones are still readable under the Resolved tab.',
            })}
            action={
              <Button variant="outline" size="sm" onClick={() => setFilter({ status: 'RESOLVED' })}>
                {t('tickets.viewResolved', { defaultValue: 'View resolved' })}
              </Button>
            }
          />
        ) : (
          <TableShell>
            <TableHead />
            <tbody className={cn('transition-opacity duration-200', stale && 'opacity-50')}>
              {rows.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  expanded={openId === ticket.id}
                  onToggle={() => setOpenId(openId === ticket.id ? null : ticket.id)}
                />
              ))}
            </tbody>
          </TableShell>
        )}

        {/* The pager. Rendered whenever there is a response to page through, including on the
            single-page case, so "1-12 of 12" is always on screen and the operator never has to
            guess whether they are looking at all of it. */}
        {!firstLoad && !!data && rows.length > 0 && (
          <div className="mt-3 flex flex-col items-center justify-between gap-3 rounded-xl border border-themed surface-card px-4 py-3 shadow-glass sm:flex-row">
            <p className="text-[13px] text-text-dim">
              {t('tickets.showingRange', {
                defaultValue: 'Showing {{from}}-{{to}} of {{total}}',
                from: pager.from,
                to: pager.to,
                total: pager.total,
              })}
              <span className="ml-2 text-text-mute">
                {narrowed
                  ? t('tickets.matchingFilters', { defaultValue: 'matching these filters' })
                  : t('tickets.inThisView', { defaultValue: 'in this view' })}
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(1)}
                disabled={!pager.hasPrevious || isPreviousData}
                aria-label="First page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ChevronLeft className="h-3.5 w-3.5" />}
                onClick={() => goToPage(pager.page - 1)}
                disabled={!pager.hasPrevious || isPreviousData}
              >
                {t('common.previous')}
              </Button>
              <span className="px-2 font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
                {pager.page} / {pager.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                rightIcon={<ChevronRight className="h-3.5 w-3.5" />}
                onClick={() => goToPage(pager.page + 1)}
                disabled={!pager.hasNext || isPreviousData}
              >
                {t('common.next')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => goToPage(pager.totalPages)}
                disabled={!pager.hasNext || isPreviousData}
                aria-label="Last page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </motion.section>
    </div>
  );
};

/* ------------------------------------------------------------------------------------------------
 * Table shell.
 * ---------------------------------------------------------------------------------------------- */

const TableShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative overflow-hidden rounded-xl border border-themed surface-card shadow-glass">
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent"
    />
    <div className="overflow-x-auto">
      {/* Fixed layout so every column keeps the same width on every page, which is what makes
          the queue scannable, plus an explicit min-width so a narrow viewport scrolls the table
          sideways instead of crushing the columns into unreadable slivers. */}
      <table className="w-full min-w-[1080px] table-fixed">
        <colgroup>
          <col className="w-[130px]" />
          <col />
          <col className="w-[170px]" />
          <col className="w-[190px]" />
          <col className="w-[170px]" />
          <col className="w-[80px]" />
          <col className="w-[44px]" />
        </colgroup>
        {children}
      </table>
    </div>
  </div>
);

const HEADERS = ['Status', 'Ticket', 'Institution', 'Raised by', 'Assigned to', 'Age', ''];

const TableHead: React.FC = () => (
  <thead>
    <tr className="border-b border-themed bg-ink-1/30">
      {HEADERS.map((h, i) => (
        <th
          key={h || `col-${i}`}
          className="whitespace-nowrap px-5 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute"
          title={h === 'Age' ? 'How long since the ticket was raised.' : undefined}
        >
          {h}
        </th>
      ))}
    </tr>
  </thead>
);

/* ------------------------------------------------------------------------------------------------
 * Empty / error panels. One shape for all four states, so only the words and the icon differ and
 * an operator learns to read the words rather than the layout.
 * ---------------------------------------------------------------------------------------------- */

const EmptyPanel: React.FC<{
  icon: LucideIcon;
  title: string;
  body: string;
  tone?: 'neutral' | 'danger' | 'good';
  action?: React.ReactNode;
}> = ({ icon: Icon, title, body, tone = 'neutral', action }) => (
  <div
    className={cn(
      'flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center',
      tone === 'danger'
        ? 'border-danger-500/30 bg-danger-500/[0.04]'
        : 'border-themed-2 bg-line/[0.02]'
    )}
  >
    <div
      className={cn(
        'mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border',
        tone === 'danger'
          ? 'border-danger-500/30 bg-danger-500/[0.06]'
          : 'border-themed bg-line/[0.03]'
      )}
    >
      <Icon
        className={cn(
          'h-6 w-6',
          tone === 'danger'
            ? 'text-danger-500'
            : tone === 'good'
            ? 'text-emerald-500'
            : 'text-text-mute'
        )}
        strokeWidth={1.75}
      />
    </div>
    <h3 className="text-[16px] font-semibold text-text">{title}</h3>
    <p className="mt-2 max-w-md text-[13px] leading-relaxed text-text-dim">{body}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/* ------------------------------------------------------------------------------------------------
 * A row, and the detail panel it opens.
 * ---------------------------------------------------------------------------------------------- */

const TicketRow: React.FC<{
  ticket: Ticket;
  expanded: boolean;
  onToggle: () => void;
}> = ({ ticket, expanded, onToggle }) => {
  const assignee = ticket.assigned_to_user;
  const resolved = ticket.status === 'RESOLVED';
  const stale = isStale(ticket);

  return (
    <>
      <tr
        onClick={onToggle}
        // The whole row is the target, so it needs to be reachable without a mouse too. A queue is
        // worked through top to bottom and tab-then-enter is how an operator does that quickly.
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
        className={cn(
          'group cursor-pointer border-b border-themed transition-colors last:border-b-0',
          'focus:outline-none focus-visible:bg-brand-cyan/[0.06]',
          expanded ? 'bg-brand-cyan/[0.04]' : 'hover:bg-line/[0.03]'
        )}
      >
        {/* Fixed row height everywhere. Every cell truncates rather than wrapping, which is what
            makes the list scannable: the old cards each grew to a different height depending on
            how many chips and how long a subject they happened to carry. */}
        <td className="overflow-hidden whitespace-nowrap px-5 py-3 align-middle">
          <StatusChip ticket={ticket} />
        </td>

        <td className="overflow-hidden px-5 py-3 align-middle">
          <div className="truncate text-[14px] font-medium text-text" title={ticket.subject}>
            {ticket.subject}
          </div>
          {/* Reopened rides here rather than beside the status chip. Two chips would not fit the
              status column without widening it for every row, and the flexible ticket column is
              the one place a variable-width badge cannot change the shape of the table. */}
          <div className="mt-0.5 flex items-center gap-2">
            <span className="truncate font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
              #{ticket.id} · {ticket.category_display || ticket.category}
            </span>
            {ticket.reopened_at && <ReopenedChip />}
          </div>
        </td>

        <td className="overflow-hidden px-5 py-3 align-middle">
          <div
            className={cn(
              'truncate text-[13px]',
              ticket.client ? 'text-text-dim' : 'text-text-mute italic'
            )}
            title={ticket.client?.name}
          >
            {/* Null only for orphaned legacy rows. Named as such rather than left blank, because a
                ticket with no tenant against it cannot be acted on from a cross-tenant queue and
                the operator needs to know that is why, not wonder if the cell failed to render. */}
            {ticket.client?.name ?? 'No institution'}
          </div>
        </td>

        <td className="overflow-hidden px-5 py-3 align-middle">
          {/* Email first here, unlike the assignee cell beside it: this is the address a super
              admin replies to, and two people at the same institution can share a display name. */}
          <div
            className="truncate text-[13px] text-text-dim"
            title={personName(ticket.raised_by, '')}
          >
            {ticket.raised_by?.email || personName(ticket.raised_by, 'Unknown')}
          </div>
        </td>

        <td className="overflow-hidden px-5 py-3 align-middle">
          {assignee?.id ? (
            <div
              className="truncate text-[13px] text-text-dim"
              title={assignee.email || personName(assignee)}
            >
              {personName(assignee, 'Unknown')}
            </div>
          ) : resolved ? (
            <span className="text-[13px] text-text-mute">Nobody</span>
          ) : (
            <span className={cn(CHIP, 'border-amber-500/30 bg-amber-500/10 text-amber-500')}>
              Unassigned
            </span>
          )}
        </td>

        <td className="whitespace-nowrap px-5 py-3 align-middle">
          <span
            className={cn(
              'font-mono text-[12px]',
              stale ? 'text-amber-500' : 'text-text-mute'
            )}
            title={
              stale
                ? `Raised ${stamp(ticket.created_at)}. Waiting more than ${STALE_DAYS} days.`
                : stamp(ticket.created_at)
            }
          >
            {ageLabel(ticket.created_at)}
          </span>
        </td>

        <td className="px-3 py-3 text-right align-middle">
          <ChevronDown
            className={cn(
              'inline h-4 w-4 text-text-mute transition-transform',
              expanded && 'rotate-180 text-brand-cyan'
            )}
          />
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-themed bg-ink-1/20">
          <td colSpan={HEADERS.length} className="px-5 pb-6 pt-1">
            <TicketDetail ticket={ticket} />
          </td>
        </tr>
      )}
    </>
  );
};

const DetailMeta: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="min-w-0">
    <MicroLabel>{label}</MicroLabel>
    <div className="mt-0.5 truncate text-[13px] text-text-dim">{children}</div>
  </div>
);

const PREFERENCE_LABEL: Record<string, string> = {
  whatsapp: 'Prefers WhatsApp',
  phone: 'Prefers a call',
  email: 'Prefers email',
};

const CONTACT_LINK =
  'inline-flex h-8 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-medium ' +
  'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/60';

/**
 * How a super admin reaches the person who raised the ticket, without leaving the queue.
 *
 * The same three actions the LMS gives a tenant's own admin (components/tickets/
 * TicketContactActions.tsx). The API has returned the number and a ready WhatsApp link since the
 * number became required; this panel was the one staff screen that still did not show them.
 *
 * The chat opens with a note naming the INSTITUTION, not AI Linc: the learner raised the ticket with
 * their institution, and a super admin resolving it already emails them exactly as that admin would.
 */
const ReachThem: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const name = greetingName(ticket.raised_by);
  const chat = whatsappChatUrl(
    ticket,
    ticketChatMessage({
      learnerName: name,
      orgName: ticket.client?.name,
      ticketId: ticket.id,
      subject: ticket.subject,
    })
  );
  const call = telFromContact(ticket);
  const email = mailtoHref(
    (ticket.contact_email || ticket.raised_by?.email || '').trim(),
    `Your support ticket #${ticket.id}`
  );
  const preference = ticket.contact_preference
    ? PREFERENCE_LABEL[ticket.contact_preference]
    : undefined;

  return (
    <div data-testid="ticket-reach-them" className="border-t border-themed pt-4">
      <MicroLabel>Reach {name ? name.split(/\s+/)[0] : 'them'}</MicroLabel>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {chat ? (
          <a
            href={chat}
            target="_blank"
            // wa.me is a third-party origin: without noopener it keeps a handle on this portal.
            rel="noopener noreferrer"
            className={cn(
              CONTACT_LINK,
              'border-emerald-500/35 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15'
            )}
          >
            <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
            WhatsApp <span className="font-mono text-[12px]">{ticket.contact_phone}</span>
          </a>
        ) : (
          <span className="text-[13px] text-text-mute">
            {ticket.contact_phone
              ? `${ticket.contact_phone} (not a WhatsApp number)`
              : // Both causes read the same: raised before the number was required, or from a tenant
                // site still on the older Support form.
                'No contact number on this ticket.'}
          </span>
        )}

        {call && (
          <a
            href={call}
            className={cn(
              CONTACT_LINK,
              'border-themed-2 text-text hover:border-brand-cyan/50 hover:text-brand-cyan'
            )}
          >
            <Phone className="h-3.5 w-3.5" strokeWidth={1.75} />
            Call
          </a>
        )}

        {email && (
          <a
            href={email}
            className={cn(
              CONTACT_LINK,
              'border-themed-2 text-text hover:border-brand-cyan/50 hover:text-brand-cyan'
            )}
          >
            <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
            Email
          </a>
        )}

        {preference && <span className="text-[12px] text-text-mute">{preference}</span>}
      </div>
    </div>
  );
};

const TicketDetail: React.FC<{ ticket: Ticket }> = ({ ticket }) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resolve = useResolveTicket();
  const setStatus = useSetTicketStatus();
  const assign = useAssignTicket();
  // Fetched only while the row is open: an assignee list per row would be one request per ticket.
  const { data: assignees, isLoading: assigneesLoading } = useTicketAssignees(ticket.id);

  const busy = resolve.isPending || setStatus.isPending || assign.isPending;
  const resolved = ticket.status === 'RESOLVED';

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      // Never swallowed into a silent no-op: a failed assign that looks like a success means
      // nobody is coming for this ticket and nobody knows it.
      setError(detail || 'That did not go through. Nothing was changed. Try again.');
    }
  };

  const attachments = ticket.user_attachments ?? [];
  const adminAttachments = ticket.admin_attachments ?? [];
  const attachmentItems = useMemo(
    () => [
      ...attachments.map((url, i) => ({ url, label: `From reporter ${i + 1}` })),
      ...adminAttachments.map((url, i) => ({ url, label: `From admin ${i + 1}` })),
    ],
    // Carries the NEWEST signed URLs. The viewer keeps showing each file with the URL it opened
    // with (so a refetch never restarts a video) and falls back to these when that one fails.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [attachments.join('\n'), adminAttachments.join('\n')]
  );
  const [viewing, setViewing] = useState<number | null>(null);

  return (
    <div className="space-y-5 rounded-xl border border-themed bg-ink-1/40 p-5">
      <div>
        <MicroLabel>Description</MicroLabel>
        <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-relaxed text-text">
          {ticket.description || 'No description was given.'}
        </p>
      </div>

      {/* Everything the API already returns about this ticket. Assigned-by, the cohort and the
          resolution timestamp were all being fetched and thrown away. */}
      <div className="grid gap-x-6 gap-y-3 border-t border-themed pt-4 sm:grid-cols-2 lg:grid-cols-4">
        <DetailMeta label="Institution">{ticket.client?.name ?? 'No institution'}</DetailMeta>
        <DetailMeta label="Category">{ticket.category_display || ticket.category}</DetailMeta>
        <DetailMeta label="Raised by">
          {ticket.raised_by?.email || personName(ticket.raised_by, 'Unknown')}
        </DetailMeta>
        <DetailMeta label="Raised">
          {ticket.created_at ? formatDate(ticket.created_at, 'MMM dd, yyyy HH:mm') : 'Unknown'}
        </DetailMeta>
        {ticket.cohort_name && <DetailMeta label="Cohort">{ticket.cohort_name}</DetailMeta>}
        {ticket.assigned_by_user?.id && (
          <DetailMeta label="Assigned by">
            {personName(ticket.assigned_by_user, 'Unknown')}
          </DetailMeta>
        )}
        {ticket.assigned_at && (
          <DetailMeta label="Assigned">
            {formatDate(ticket.assigned_at, 'MMM dd, yyyy HH:mm')}
          </DetailMeta>
        )}
        {ticket.reopened_at && (
          <DetailMeta label="Reopened">
            {formatDate(ticket.reopened_at, 'MMM dd, yyyy HH:mm')}
          </DetailMeta>
        )}
        {ticket.resolved_at && (
          <DetailMeta label="Resolved">
            {formatDate(ticket.resolved_at, 'MMM dd, yyyy HH:mm')}
          </DetailMeta>
        )}
      </div>

      <ReachThem ticket={ticket} />

      {(attachments.length > 0 || adminAttachments.length > 0) && (
        <div className="border-t border-themed pt-4">
          <MicroLabel>Attachments</MicroLabel>
          <div className="mt-2 flex flex-wrap gap-2">
            {attachmentItems.map((a, i) => (
              // Opens in the portal rather than a new tab: working a queue should not leave a
              // stack of storage tabs behind every ticket.
              <button
                key={`${a.url}-${i}`}
                type="button"
                onClick={() => setViewing(i)}
                className={cn(
                  CHIP,
                  'border-themed-2 bg-line/[0.06] text-text-dim transition-colors hover:border-brand-cyan/40 hover:text-brand-cyan',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50'
                )}
              >
                <Paperclip className="h-2.5 w-2.5" />
                {a.label}
              </button>
            ))}
          </div>
          <TicketAttachmentViewer
            items={attachmentItems}
            index={viewing}
            onIndex={setViewing}
            onClose={() => setViewing(null)}
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-danger-500/30 bg-danger-500/[0.06] px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger-500" />
          <p className="text-[13px] text-danger-500">{error}</p>
        </div>
      )}

      {resolved ? (
        <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <MicroLabel className="text-emerald-500">
              Resolved
              {personName(ticket.resolved_by_user, '')
                ? ` by ${personName(ticket.resolved_by_user, '')}`
                : ''}
            </MicroLabel>
          </div>
          {ticket.admin_resolution_notes ? (
            <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-text-dim">
              {ticket.admin_resolution_notes}
            </p>
          ) : (
            <p className="mt-2 text-[13px] text-text-mute">No resolution notes were recorded.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 border-t border-themed pt-4">
          {/* Assignment. The server restricts it to the ticket's own tenant and the picker only
              ever offers that tenant: assigning someone from another institution would email them
              a link into a course they cannot see. */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[240px]">
              <MicroLabel>Assign to</MicroLabel>
              <div className="mt-1.5">
                <Select
                  value={ticket.assigned_to_user?.id ? String(ticket.assigned_to_user.id) : ''}
                  disabled={busy || assigneesLoading}
                  onChange={(v) =>
                    void run(() =>
                      assign.mutateAsync({
                        id: ticket.id,
                        assignedTo: v ? Number(v) : null,
                      })
                    )
                  }
                >
                  <option value="">Nobody</option>
                  {(assignees ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.email} ({a.role})
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <span className="flex h-10 items-center gap-1.5 text-[12px] text-text-mute">
              <Mail className="h-3.5 w-3.5" strokeWidth={1.75} />
              {assigneesLoading
                ? 'Loading this institution’s staff…'
                : 'They get an email'}
            </span>

            {ticket.status === 'OPEN' && (
              <Button
                variant="outline"
                size="sm"
                className="h-10"
                leftIcon={<Clock className="h-3.5 w-3.5" />}
                disabled={busy}
                isLoading={setStatus.isPending}
                onClick={() =>
                  void run(() => setStatus.mutateAsync({ id: ticket.id, status: 'IN_PROGRESS' }))
                }
              >
                Mark in progress
              </Button>
            )}
          </div>

          <div>
            <MicroLabel>Resolution notes</MicroLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={busy}
              placeholder="What was done. This is emailed verbatim to the person who raised it."
              // Same shell as Input, which has no multiline variant. Kept in sync by hand rather
              // than left as the ad-hoc box this page had, which used undefined colour tokens.
              className="mt-1.5 w-full rounded-lg border border-themed-2 bg-ink-1/60 p-3 text-[14px]
                text-text placeholder:text-text-mute transition-colors focus:border-brand-cyan/50
                focus:bg-ink-1/90 focus:outline-none focus:shadow-[0_0_0_3px_rgba(0,224,255,0.12)]
                disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="mt-2 flex items-center gap-3">
              <Button
                size="sm"
                leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
                disabled={busy || !notes.trim()}
                isLoading={resolve.isPending}
                onClick={() =>
                  void run(async () => {
                    await resolve.mutateAsync({ id: ticket.id, notes: notes.trim() });
                    setNotes('');
                  })
                }
              >
                Resolve and notify
              </Button>
              {!notes.trim() && (
                <span className="text-[12px] text-text-mute">
                  Notes are required: they are the whole content of the email the reporter gets.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
