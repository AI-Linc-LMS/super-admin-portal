/** Cross-tenant support tickets, as served by `/superadmin/api/tickets/`. */

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

/**
 * A person hanging off a ticket: who raised it, who owns it, who assigned it, who closed it.
 * Mirrors apis/serializers.py::_TicketUserMiniSerializer, which is the shape the API really sends.
 *
 * The key is `full_name`, NOT `name`. This type used to declare `name`, which no endpoint on the
 * ticket surface has ever emitted, so every read of it was `undefined` and TypeScript could not
 * say so: the reads were all written as `person.name || person.email`, and the fallback quietly
 * absorbed it. The visible result was an email address everywhere an operator expected a name, and
 * on the resolved banner, which had no fallback, the resolver's name simply never appeared.
 *
 * Do not add a `name` alias back. `TicketAssignee` below is a DIFFERENT shape from a DIFFERENT
 * endpoint (`/assignees/`, which builds its rows by hand) and that one really does send `name`;
 * an alias here would make the two look interchangeable, which is how this drifted in the first
 * place. Use `personName()` when you want something printable.
 */
export interface TicketPerson {
  /** UserProfile id. This is what the assign endpoint takes, so it must match TicketAssignee.id. */
  id: number | null;
  user_id?: number | null;
  /** May be an empty string when the account has no name and no username. */
  full_name: string;
  /** Null when the profile has no user row behind it. */
  email: string | null;
  role?: string;
}

/**
 * What to print for a person, given that either half can be missing.
 *
 * Centralised because the fallback order is a decision, not a formatting detail: a name identifies
 * the human, an email identifies the account, and printing the raw fallback at each call site is
 * what let the missing `full_name` above go unnoticed for as long as it did.
 */
export function personName(person?: TicketPerson | null, fallback = 'Unknown'): string {
  if (!person) return fallback;
  return person.full_name?.trim() || person.email || fallback;
}

export interface TicketClientRef {
  id: number;
  name: string;
}

export interface Ticket {
  id: number;
  subject: string;
  description: string;
  category: string;
  category_display: string;
  status: TicketStatus;
  status_display: string;
  created_at: string;
  updated_at?: string;
  resolved_at?: string | null;
  reopened_at?: string | null;
  admin_resolution_notes?: string;
  /** The institution the ticket belongs to. Null only for orphaned legacy rows — a ticket with
   *  no tenant against it cannot be acted on from a cross-tenant queue. */
  client: TicketClientRef | null;
  raised_by?: TicketPerson | null;
  assigned_to_user?: TicketPerson | null;
  assigned_by_user?: TicketPerson | null;
  resolved_by_user?: TicketPerson | null;
  assigned_at?: string | null;
  user_attachments?: string[];
  admin_attachments?: string[];
  resolution_history?: Array<Record<string, unknown>>;
  reopen_history?: Array<Record<string, unknown>>;
  cohort_name?: string | null;
  /** How to reach the reporter. Required on new tickets since 2026-09-14; empty on older ones and
   *  on tickets from a tenant site still running the older Support form. */
  contact_email?: string;
  /** E.164, e.g. "+966501234567". Older rows may hold a bare number or nothing. */
  contact_phone?: string;
  contact_preference?: 'whatsapp' | 'phone' | 'email' | '';
  /** A ready wa.me link built by the server, or null when the number cannot be dialled. */
  whatsapp_url?: string | null;
}

/** Platform-wide, never scoped to the current filter — see the list view's comment. */
export interface TicketCounts {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  /** Not resolved and nobody owns it. The number that actually needs someone to act. */
  unassigned: number;
}

export interface TicketListResponse {
  results: Ticket[];
  /** Rows matching the CURRENT filter, not the platform total. Compare with `counts` below. */
  total: number;
  /** The page the server actually served. It clamps to the last page, so asking for page 9 of a
   *  3-page set answers with 3 and says so here; the caller has to sync its own state to this or
   *  its pager will keep claiming a page nobody is on. */
  page: number;
  page_size: number;
  /** Optional only because the portal and the API deploy separately: a bundle running against an
   *  API older than these fields must still render a working pager, so every read goes through
   *  readPager() below rather than touching them directly. Never infer paging from
   *  `results.length` instead: an exactly-full last page is indistinguishable from a full middle
   *  page, and that guess is what puts a dead "next" button on the last page. */
  total_pages?: number;
  has_next?: boolean;
  has_previous?: boolean;
  counts: TicketCounts;
}

/** What a pager needs, present whether or not the API sent the newer fields. */
export interface TicketPager {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  /** 1-based inclusive range of the rows on screen, for "showing 26-50 of 312". */
  from: number;
  to: number;
  total: number;
}

/**
 * Normalise the list response into something a pager can render.
 *
 * The fallback arm is not decoration: without it, a portal deployed ahead of the API renders
 * `total_pages` as undefined, every comparison against it is false, and the operator gets a pager
 * frozen on page 1 that looks exactly like "there is only one page of tickets". Deriving the same
 * numbers from `total` and `page_size` keeps the pager honest across that window.
 */
export function readPager(data?: TicketListResponse | null): TicketPager {
  const total = data?.total ?? 0;
  const pageSize = data?.page_size || 25;
  const page = data?.page ?? 1;
  const totalPages = data?.total_pages ?? Math.max(1, Math.ceil(total / pageSize));
  const rows = data?.results?.length ?? 0;
  return {
    page,
    pageSize,
    totalPages,
    hasNext: data?.has_next ?? page < totalPages,
    hasPrevious: data?.has_previous ?? page > 1,
    // Derived from the rows actually returned rather than from page_size, so a short last page
    // reports "301-312 of 312" instead of over-claiming "301-325".
    from: rows === 0 ? 0 : (page - 1) * pageSize + 1,
    to: rows === 0 ? 0 : (page - 1) * pageSize + rows,
    total,
  };
}

export interface TicketClientStat {
  client_id: number;
  client_name: string;
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  unassigned: number;
}

export interface TicketStats {
  totals: TicketCounts;
  by_client: TicketClientStat[];
}

/** Candidates for assignment — always from the ticket's OWN tenant. */
export interface TicketAssignee {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface TicketFilters {
  status?: TicketStatus | 'all';
  category?: string;
  clientId?: number;
  assignedTo?: number | 'unassigned';
  search?: string;
  reopened?: boolean;
  page?: number;
  /** Server default is 25 and it caps at 100. Sent explicitly so the query key states the page
   *  size it actually asked for; a key that omits it cannot tell two different page sizes apart. */
  pageSize?: number;
}

/** The six the backend accepts. An unknown value is ignored server-side rather than emptying the
 *  queue, but the picker only ever offers these so an operator cannot type one. */
export const TICKET_CATEGORIES: { value: string; label: string }[] = [
  { value: 'technical', label: 'Technical Support' },
  { value: 'content', label: 'Content Help' },
  { value: 'video', label: 'Video Help' },
  { value: 'quiz', label: 'Quiz/Assessment Help' },
  { value: 'navigation', label: 'Navigation Help' },
  { value: 'other', label: 'Other' },
];

/** Server default and the server's own cap. 100 is not a suggestion: asking for more is silently
 *  clamped, so offering 250 here would print a page size the API never served. */
export const TICKET_PAGE_SIZES = [25, 50, 100];
