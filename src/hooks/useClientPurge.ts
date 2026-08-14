import { useMutation, useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type {
  PurgeConfirmation,
  PurgeManifest,
  PurgeQueuedResponse,
  PurgeStatus,
  PurgeStatusResponse,
} from '../types/clientPurge';

const baseUrl = (clientId: number) => `/superadmin/api/clients/${clientId}/`;

/** Statuses the worker will never move off. Polling past one of these is a request per two
 *  seconds, forever, for an answer that cannot change. */
const TERMINAL_STATUSES: PurgeStatus[] = ['completed', 'failed', 'refused', 'dry_run'];

export const isTerminalPurgeStatus = (status?: PurgeStatus) =>
  !!status && TERMINAL_STATUSES.includes(status);

/**
 * The preflight plan. POST, because a deep plan runs ~150 count queries, walks every S3 prefix the
 * tenant owns and resolves its Netlify site, and none of that should be reachable by following a
 * link. It still reads nothing but rows.
 */
export const usePurgePreview = (clientId: number, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['client-purge', 'preview', clientId],
    queryFn: async () => {
      const url = `${baseUrl(clientId)}purge/preview/`;
      try {
        return await apiService.post<PurgeManifest>(url, { deep: true });
      } catch (error) {
        // Retried shallow ONLY when the request never got an answer, which for this call means the
        // 10s axios timeout beat a deep plan on a tenant with a large bucket. A 403, a 404 or a 500
        // has a response attached and is rethrown untouched: those are refusals and failures, and
        // answering them with a second request would bury them.
        //
        // Safe to fall back because manifest_hash is computed from nothing that needs a network
        // call, so the shallow plan yields a confirmation the execute endpoint accepts. What is
        // lost is the row counts, the object sizing and the Netlify lookup, and the manifest says
        // so via `deep: false` rather than leaving the modal to imply it measured them.
        if ((error as { response?: unknown })?.response) throw error;
        return apiService.post<PurgeManifest>(url, { deep: false });
      }
    },
    enabled: (options?.enabled ?? true) && clientId > 0,
    retry: false,
    // Never served from cache. A manifest_hash from an earlier sitting is exactly the stale
    // confirmation the execute endpoint exists to reject, and showing the operator a plan built
    // before somebody mapped this tenant's template course elsewhere is worse than a spinner.
    cacheTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

/** Queue the purge. Everything past a 202 here is irreversible. */
export const usePurgeClient = (clientId: number) =>
  useMutation({
    mutationFn: (confirmation: PurgeConfirmation) =>
      apiService.post<PurgeQueuedResponse>(`${baseUrl(clientId)}purge/`, confirmation),
  });

/**
 * Poll one purge by its own id.
 *
 * Keyed by purge id and never by client id, matching the backend route: the answer is wanted most
 * at the exact moment there is no client row left to look one up from.
 */
export const usePurgeStatus = (purgeId: number | null) =>
  useQuery({
    queryKey: ['client-purge', 'status', purgeId],
    queryFn: () =>
      apiService.get<PurgeStatusResponse>(`/superadmin/api/clients/purges/${purgeId}/`),
    enabled: purgeId !== null,
    // retry:false everywhere else in this repo means "do not hide a 403". Here it also matters that
    // a poll that fails must show as failed rather than freezing the checklist on the last frame it
    // managed to fetch.
    retry: false,
    refetchInterval: (data) => (isTerminalPurgeStatus(data?.status) ? false : 2000),
    refetchOnWindowFocus: false,
  });
