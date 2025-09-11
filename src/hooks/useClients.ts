import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Client, ClientDetails } from '../types/client';

export const useClients = (params?: any) => {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: () => apiService.getClients(params),
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useClientDetails = (clientId: number) => {
  return useQuery({
    queryKey: ['client-details', clientId],
    queryFn: () => apiService.getClientDetails(clientId),
    enabled: !!clientId,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (clientData: Partial<Client>) => apiService.createClient(clientData),
    onSuccess: () => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data, method = 'PUT' }: { 
      id: number; 
      data: Partial<Client>; 
      method?: 'PUT' | 'PATCH' 
    }) => apiService.updateClient(id, data, method),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch clients list and specific client details
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-details', id] });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (clientId: number) => apiService.deleteClient(clientId),
    onSuccess: () => {
      // Invalidate and refetch clients list
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useToggleClientStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) => 
      apiService.toggleClientStatus(id, isActive),
    onSuccess: (_, { id }) => {
      // Invalidate and refetch clients list and specific client details
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client-details', id] });
    },
  });
};