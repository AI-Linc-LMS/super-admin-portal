import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type { ClientTutorConfigUpdate } from '../types/aiTutor';

const key = (clientId: number) => ['ai-tutor-config', clientId] as const;

/**
 * One tenant's AI Tutor configuration.
 *
 * `enabled` guards the call so a client-detail page for a tenant that has not loaded yet
 * does not fire a request for `NaN`.
 */
export const useAiTutorConfig = (clientId: number, enabled = true) =>
  useQuery({
    queryKey: key(clientId),
    queryFn: () => apiService.getClientTutorConfig(clientId),
    enabled: enabled && Number.isFinite(clientId) && clientId > 0,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useUpdateAiTutorConfig = (clientId: number) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ClientTutorConfigUpdate) =>
      apiService.updateClientTutorConfig(clientId, data),
    onSuccess: (response) => {
      // Seed the cache from the response rather than invalidating, so the picker does not
      // flicker back to the previous model while a refetch is in flight.
      queryClient.setQueryData(key(clientId), response);
    },
    // No toast here. The axios response interceptor already toasts every failure, and it
    // now extracts the DRF field message itself, so a second one here would double every
    // error. The mutation still rejects, which is what the panel needs.
  });
};
