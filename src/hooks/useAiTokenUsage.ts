import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { AiTokenUsageParams } from '../types/aiTokenUsage';

export const useAiTokenUsage = (params?: AiTokenUsageParams) => {
  return useQuery({
    queryKey: ['ai-token-usage', params],
    queryFn: () => apiService.getAiTokenUsage(params),
    retry: false,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

/**
 * The ledger's own error bar. Deliberately a separate query from the summary: it describes the
 * WHOLE ledger (all time, every tenant), so it must not move when the dashboard filters do —
 * a coverage gap that shrank because you picked a month would be worse than not showing one.
 */
export const useAiUsageIntegrity = () => {
  return useQuery({
    queryKey: ['ai-usage-integrity'],
    queryFn: () => apiService.getAiUsageIntegrity(),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

/** Drill-down for one module. Disabled until a module is actually selected. */
export const useAiUsageModule = (
  moduleKey: string | null,
  params?: { months?: number; client_id?: number }
) => {
  return useQuery({
    queryKey: ['ai-usage-module', moduleKey, params],
    queryFn: () => apiService.getAiUsageModule(moduleKey as string, params),
    enabled: Boolean(moduleKey),
    retry: false,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};
