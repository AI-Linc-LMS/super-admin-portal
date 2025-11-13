import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { Client, ClientDetails, Feature, CourseOperationRequest } from '../types/client';

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
  return useQuery<ClientDetails | null>({
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

export const useChangeUserRole = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ clientId, userId, newRole }: { 
      clientId: number; 
      userId: number; 
      newRole: string 
    }) => apiService.changeUserRole(clientId, userId, newRole),
    onSuccess: (_, { clientId }) => {
      // Invalidate and refetch client details to update the user lists
      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      // Also invalidate clients list in case it affects summary counts
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useUpdateCourse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ clientId, courseId, courseData }: { 
      clientId: number; 
      courseId: number; 
      courseData: { price?: number; is_free?: boolean; published?: boolean } 
    }) => apiService.updateCourse(clientId, courseId, courseData),
    onSuccess: (_, { clientId }) => {
      // Invalidate and refetch client details to update the course list
      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      // Also invalidate clients list in case it affects summary counts
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

// Features hooks
export const useAvailableFeatures = () => {
  return useQuery({
    queryKey: ['available-features'],
    queryFn: () => apiService.getAvailableFeatures(),
    retry: false,
    staleTime: 10 * 60 * 1000, // 10 minutes - features don't change often
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useClientFeatures = (clientId: number) => {
  return useQuery({
    queryKey: ['client-features', clientId],
    queryFn: () => apiService.getClientFeatures(clientId),
    enabled: !!clientId,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useUpdateClientFeatures = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ clientId, featureIds }: { 
      clientId: number; 
      featureIds: number[] 
    }) => apiService.updateClientFeatures(clientId, featureIds),
    onSuccess: (_, { clientId }) => {
      // Invalidate and refetch client features
      queryClient.invalidateQueries({ queryKey: ['client-features', clientId] });
      // Invalidate and refetch client details to update the features list
      queryClient.invalidateQueries({ queryKey: ['client-details', clientId] });
      // Also invalidate clients list in case it affects summary
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

// Course Operations hooks
export const useDuplicateCourse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CourseOperationRequest) => apiService.duplicateCourse(request),
    onSuccess: () => {
      // Invalidate operations list to show the new operation
      queryClient.invalidateQueries({ queryKey: ['course-operations'] });
    },
  });
};

export const useBulkDuplicateCourses = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CourseOperationRequest) => apiService.bulkDuplicateCourses(request),
    onSuccess: () => {
      // Invalidate operations list to show the new operation
      queryClient.invalidateQueries({ queryKey: ['course-operations'] });
    },
  });
};

export const useDeleteCourse = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: CourseOperationRequest) => apiService.deleteCourse(request),
    onSuccess: () => {
      // Invalidate operations list to show the new operation
      queryClient.invalidateQueries({ queryKey: ['course-operations'] });
    },
  });
};

export const useOperationStatus = (operationId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['operation-status', operationId],
    queryFn: () => apiService.getOperationStatus(operationId),
    enabled: enabled && !!operationId,
    refetchInterval: (data) => {
      // Auto-refresh every 2 seconds if operation is still in progress
      if (data?.status === 'pending' || data?.status === 'in_progress') {
        return 2000;
      }
      return false;
    },
    staleTime: 1000, // Consider data stale after 1 second
  });
};

export const useOperationsList = (params?: { 
  type?: string; 
  status?: string; 
  limit?: number; 
  offset?: number; 
}) => {
  return useQuery({
    queryKey: ['course-operations', params],
    queryFn: () => apiService.getOperationsList(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
};