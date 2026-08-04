/** Cross-tenant support tickets, as served by `/superadmin/api/tickets/`. */

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export interface TicketPerson {
  id: number | null;
  name: string;
  email: string;
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
  total: number;
  page: number;
  page_size: number;
  counts: TicketCounts;
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
}
