import { useQuery } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { AiCostDailyParams } from '../types/aiCostDaily';

/**
 * The cross-tenant daily cost matrix.
 *
 * Separate query from `useAiTokenUsage`: that one answers "how much, by month, in total", this
 * one answers "which tenant, on which day". They share a ledger and nothing else, and folding
 * them into one request would make the heatmap wait on breakdowns it does not draw.
 */
export const useAiCostDaily = (params?: AiCostDailyParams) =>
  useQuery({
    queryKey: ['ai-cost-daily', params],
    queryFn: () => apiService.getAiCostDaily(params),
    retry: false,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
