import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  CheckCircle2,
  Clock,
  Inbox,
  LifeBuoy,
  Mail,
  RefreshCw,
  RotateCcw,
  Search,
  UserPlus,
} from 'lucide-react';

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
import { Ticket, TicketFilters, TicketStatus } from '../types/ticket';
import { cn } from '../utils/helpers';

const STATUS_TONE: Record<TicketStatus, string> = {
  OPEN: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  IN_PROGRESS: 'border-sky-500/30 bg-sky-500/10 text-sky-600',
  RESOLVED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600',
};

const TABS: { value: TicketFilters['status']; label: string; countKey: keyof Ticket | string }[] = [
  { value: undefined, label: 'Needs someone', countKey: 'needs' },
  { value: 'OPEN', label: 'Open', countKey: 'open' },
  { value: 'IN_PROGRESS', label: 'In progress', countKey: 'in_progress' },
  { value: 'RESOLVED', label: 'Resolved', countKey: 'resolved' },
  { value: 'all', label: 'All', countKey: 'total' },
];

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return '';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/**
 * Every institution's support tickets in one queue.
 *
 * A super admin could always SEE that a tenant had tickets; acting on one meant signing in as
 * that tenant's admin. This is the same worklist with the same actions, across all of them.
 *
 * It opens on what still needs someone rather than on everything ever raised — a queue that
 * starts with years of resolved tickets is a report.
 */
const Tickets: React.FC = () => {
  const [status, setStatus] = useState<TicketFilters['status']>(undefined);
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState<number | undefined>(undefined);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);

  const filters: TicketFilters = {
    status,
    search: search.trim() || undefined,
    clientId,
    assignedTo: unassignedOnly ? 'unassigned' : undefined,
  };
  const { data, isLoading, refetch, isFetching } = useTickets(filters);
  const { data: stats } = useTicketStats();

  const rows = data?.results ?? [];
  const counts = data?.counts;
  const needs = counts ? counts.open + counts.in_progress : 0;

  const countFor = (key: string): number => {
    if (!counts) return 0;
    if (key === 'needs') return needs;
    return (counts as unknown as Record<string, number>)[key] ?? 0;
  };

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <span className="kicker mb-3">
            <LifeBuoy className="mr-2 h-3 w-3" />
            Support
          </span>
          <h1 className="text-3xl font-bold tracking-tight">Tickets</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Every institution&apos;s support queue in one place. Resolving one emails the person
            who raised it, exactly as their own admin would — and assigning one emails whoever you
            hand it to.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </motion.section>

      {/* Per-tenant backlog. The point of a cross-tenant queue is seeing WHERE the load is. */}
      {stats && stats.by_client.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.by_client.slice(0, 8).map((c) => (
            <button
              key={c.client_id}
              onClick={() => setClientId(clientId === c.client_id ? undefined : c.client_id)}
              className={cn(
                'rounded-2xl border p-4 text-left transition',
                clientId === c.client_id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              )}
            >
              <div className="flex items-center gap-2 text-sm font-bold">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{c.client_name}</span>
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-2xl font-bold">{c.open + c.in_progress}</span>
                <span className="text-xs text-muted-foreground">need someone</span>
              </div>
              {c.unassigned > 0 && (
                <p className="mt-1 text-xs font-semibold text-amber-600">
                  {c.unassigned} unassigned
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setStatus(t.value)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
              status === t.value
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            {/* Platform-wide, never scoped to the current filter — tabs that renumber
                themselves as you click them cannot tell you how much is left. */}
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
              {countFor(String(t.countKey))}
            </span>
          </button>
        ))}
        <button
          onClick={() => setUnassignedOnly((v) => !v)}
          className={cn(
            'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
            unassignedOnly
              ? 'border-transparent bg-amber-500 text-white'
              : 'border-border text-muted-foreground hover:text-foreground'
          )}
        >
          Unassigned only
        </button>
        {clientId && (
          <button
            onClick={() => setClientId(undefined)}
            className="rounded-full border border-border px-4 py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Clear institution filter
          </button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subject, description, reporter or institution"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border p-12 text-center text-muted-foreground">
          Loading tickets…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Nothing waiting</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {status === undefined
              ? 'No institution has an open ticket right now.'
              : 'No tickets match these filters.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((t) => (
            <TicketCard
              key={t.id}
              ticket={t}
              expanded={openId === t.id}
              onToggle={() => setOpenId(openId === t.id ? null : t.id)}
            />
          ))}
          {data && data.total > rows.length && (
            <p className="pt-2 text-center text-sm text-muted-foreground">
              Showing {rows.length} of {data.total}. Narrow the filters to see the rest.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const TicketCard: React.FC<{
  ticket: Ticket;
  expanded: boolean;
  onToggle: () => void;
}> = ({ ticket, expanded, onToggle }) => {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const resolve = useResolveTicket();
  const setStatus = useSetTicketStatus();
  const assign = useAssignTicket();
  // Fetched only when the card is open: an assignee list per row would be one request per ticket.
  const { data: assignees } = useTicketAssignees(expanded ? ticket.id : null);

  const busy = resolve.isPending || setStatus.isPending || assign.isPending;
  const resolved = ticket.status === 'RESOLVED';

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'That did not go through. Try again.');
    }
  };

  return (
    <motion.div layout className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold">{ticket.subject}</h3>
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs font-bold',
                STATUS_TONE[ticket.status]
              )}
            >
              {ticket.status_display}
            </span>
            {ticket.reopened_at && (
              <span className="flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-bold text-purple-600">
                <RotateCcw className="h-3 w-3" />
                reopened
              </span>
            )}
            {!ticket.assigned_to_user?.id && !resolved && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600">
                unassigned
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {/* The institution first: on a cross-tenant queue it is the thing that decides
                whether a ticket is even yours to read. */}
            <strong>{ticket.client?.name ?? 'Unknown institution'}</strong>
            {ticket.raised_by?.email && <> · raised by {ticket.raised_by.email}</>}
            {' · '}
            {ticket.category_display}
            {' · '}
            {timeAgo(ticket.created_at)}
          </p>
        </button>

        <div className="flex items-center gap-2 text-sm">
          {ticket.assigned_to_user?.id ? (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <UserPlus className="h-4 w-4" />
              {ticket.assigned_to_user.name || ticket.assigned_to_user.email}
            </span>
          ) : null}
          {resolved && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{ticket.description}</p>

          {(ticket.user_attachments?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-2">
              {ticket.user_attachments!.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:border-primary"
                >
                  Attachment {i + 1}
                </a>
              ))}
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-600">
              {error}
            </p>
          )}

          {resolved ? (
            <div className="rounded-xl bg-emerald-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
                Resolved
                {ticket.resolved_by_user?.name && <> by {ticket.resolved_by_user.name}</>}
              </p>
              {ticket.admin_resolution_notes && (
                <p className="mt-1 whitespace-pre-wrap text-sm">{ticket.admin_resolution_notes}</p>
              )}
            </div>
          ) : (
            <>
              {/* Assignment. Restricted to the ticket's own tenant by the server, and the
                  picker only ever offers that tenant — assigning someone from another
                  institution would email them a link into a course they cannot see. */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Assign to
                </span>
                <select
                  value={ticket.assigned_to_user?.id ?? ''}
                  disabled={busy}
                  onChange={(e) =>
                    void run(() =>
                      assign.mutateAsync({
                        id: ticket.id,
                        assignedTo: e.target.value ? Number(e.target.value) : null,
                      })
                    )
                  }
                  className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
                >
                  <option value="">Nobody</option>
                  {(assignees ?? []).map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name || a.email} ({a.role})
                    </option>
                  ))}
                </select>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  they get an email
                </span>

                {ticket.status === 'OPEN' && (
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        setStatus.mutateAsync({ id: ticket.id, status: 'IN_PROGRESS' })
                      )
                    }
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    Mark in progress
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Resolution notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="What was done. This is emailed to the person who raised it."
                  className="w-full rounded-xl border border-border bg-background p-3 text-sm"
                />
                <Button
                  disabled={busy || !notes.trim()}
                  onClick={() =>
                    void run(async () => {
                      await resolve.mutateAsync({ id: ticket.id, notes: notes.trim() });
                      setNotes('');
                    })
                  }
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {resolve.isPending ? 'Resolving…' : 'Resolve and notify'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default Tickets;
