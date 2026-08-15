import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiService } from '../services/api';
import {
  Ticket,
  TicketAssignee,
  TicketFilters,
  TicketListResponse,
  TicketStats,
  TicketStatus,
} from '../types/ticket';

const BASE = '/superadmin/api/tickets/';

export const useTickets = (filters: TicketFilters = {}) => {
  return useQuery({
    queryKey: ['tickets', filters],
    queryFn: async (): Promise<TicketListResponse> => {
      const params: Record<string, string> = {};
      // Sent explicitly even though the server defaults to "still open": leaving it implicit
      // makes the query key claim a filter the request never carried.
      if (filters.status) params.status = filters.status === 'all' ? 'ALL' : filters.status;
      if (filters.category) params.category = filters.category;
      if (filters.clientId) params.client = String(filters.clientId);
      if (filters.assignedTo !== undefined) params.assigned_to = String(filters.assignedTo);
      if (filters.search) params.search = filters.search;
      if (filters.reopened) params.reopened = '1';
      if (filters.page) params.page = String(filters.page);
      // Sent explicitly rather than riding the server default. Without it the portal could only
      // ever reach 25 rows a page while believing it had asked for whatever the operator picked.
      if (filters.pageSize) params.page_size = String(filters.pageSize);
      return apiService.get<TicketListResponse>(BASE, params);
    },
    retry: false,
    staleTime: 20 * 1000,
    refetchOnWindowFocus: true,
    // Paging must not blank the table. Without this the queue unmounts to a loading state on every
    // next-page click, which on a slow request is indistinguishable from the list having emptied,
    // and the operator loses their scroll position on the way back. The previous page stays on
    // screen, dimmed by the caller via isPreviousData, until the new one lands.
    keepPreviousData: true,
  });
};

export const useTicket = (id: number | null) => {
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: async (): Promise<Ticket> => apiService.get<Ticket>(`${BASE}${id}/`),
    enabled: !!id,
    retry: false,
    // Always on mount: a stale row would offer Resolve on a ticket another admin just closed,
    // and resolving twice sends the reporter a second email.
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
};

export const useTicketStats = () => {
  return useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async (): Promise<TicketStats> => apiService.get<TicketStats>(`${BASE}stats/`),
    retry: false,
    staleTime: 60 * 1000,
  });
};

/** The assignee picker is per ticket, not global: only the ticket's own tenant may be assigned. */
export const useTicketAssignees = (ticketId: number | null) => {
  return useQuery({
    queryKey: ['ticket-assignees', ticketId],
    queryFn: async (): Promise<TicketAssignee[]> =>
      apiService.get<TicketAssignee[]>(`${BASE}${ticketId}/assignees/`),
    enabled: !!ticketId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

/** Anything that mutates a ticket invalidates the row, the queue and the per-tenant stats. */
function useTicketMutation<TArgs extends { id: number }>(fn: (args: TArgs) => Promise<Ticket>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['tickets'] });
      void qc.invalidateQueries({ queryKey: ['ticket', variables.id] });
      void qc.invalidateQueries({ queryKey: ['ticket-stats'] });
    },
  });
}

/**
 * Resolving carries the notes AND emails the person who raised it. It is the only route that
 * closes a ticket — the plain status route refuses RESOLVED for exactly this reason.
 */
export const useResolveTicket = () =>
  useTicketMutation<{ id: number; notes: string }>(({ id, notes }) =>
    apiService.post<Ticket>(`${BASE}${id}/resolve/`, { admin_resolution_notes: notes })
  );

export const useSetTicketStatus = () =>
  useTicketMutation<{ id: number; status: Exclude<TicketStatus, 'RESOLVED'> }>(({ id, status }) =>
    apiService.post<Ticket>(`${BASE}${id}/status/`, { status })
  );

/** `null` unassigns. The assignee is emailed a link to the ticket. */
export const useAssignTicket = () =>
  useTicketMutation<{ id: number; assignedTo: number | null }>(({ id, assignedTo }) =>
    apiService.post<Ticket>(`${BASE}${id}/assign/`, { assigned_to: assignedTo })
  );
