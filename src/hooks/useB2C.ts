import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { B2CConfigUpdate } from '../types/b2c';

export const useB2CConfig = (clientId: number) => {
  return useQuery({
    queryKey: ['b2c-config', clientId],
    queryFn: () => apiService.getB2CConfig(clientId),
    enabled: !!clientId,
    retry: false,
    refetchOnWindowFocus: false,
  });
};

export const useUpdateB2CConfig = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, payload }: { clientId: number; payload: B2CConfigUpdate }) =>
      apiService.updateB2CConfig(clientId, payload),
    onSuccess: (_, { clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['b2c-config', clientId] });
    },
  });
};
