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
