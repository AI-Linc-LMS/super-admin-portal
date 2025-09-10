import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { apiService } from '../services/api';
import { DashboardStats, CoursesResponse } from '../types/course';
import { Client, ClientDetails } from '../types/client';

// Dashboard hooks
export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      console.log('🚀 Making API call to dashboard stats');
      try {
        const result = await apiService.get<DashboardStats>('/superadmin/api/dashboard/');
        console.log('✅ Dashboard stats API response:', result);
        return result;
      } catch (error) {
        console.error('❌ Dashboard stats API error:', error);
        // Return null instead of throwing to avoid infinite loading
        return null;
      }
    },
    refetchInterval: false, // Disable auto-refetch to stop loading loops
    retry: false, // Don't retry failed requests
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch on mount if we have cached data
  });
};

// Course hooks
export const useCourses = () => {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      console.log('🚀 Making API call to courses');
      try {
        const result = await apiService.get<CoursesResponse>('/superadmin/api/ai-linc/courses/');
        console.log('✅ Courses API response:', result);
        return result;
      } catch (error) {
        console.error('❌ Courses API error:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Client hooks
export const useClients = (params?: any) => {
  return useQuery({
    queryKey: ['clients', params],
    queryFn: async () => {
      console.log('🚀 Making API call to clients with params:', params);
      try {
        const result = await apiService.get<Client[]>('/superadmin/api/clients/', params);
        console.log('✅ Clients API response:', result);
        return result;
      } catch (error) {
        console.error('❌ Clients API error:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useClientDetails = (clientId: number) => {
  return useQuery({
    queryKey: ['client-details', clientId],
    queryFn: async () => {
      console.log('🚀 Making API call to client details for ID:', clientId);
      try {
        const result = await apiService.get<ClientDetails>(`/superadmin/api/clients/${clientId}/`);
        console.log('✅ Client details API response:', result);
        return result;
      } catch (error) {
        console.error('❌ Client details API error:', error);
        return null;
      }
    },
    enabled: !!clientId,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

// Generic API hook
export const useApiData = <T>(
  endpoint: string, 
  params?: any, 
  options?: Omit<UseQueryOptions<T>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: [endpoint, params],
    queryFn: async () => {
      console.log('🚀 Making generic API call to:', endpoint, 'with params:', params);
      try {
        const result = await apiService.get<T>(endpoint, params);
        console.log('✅ Generic API response:', result);
        return result;
      } catch (error) {
        console.error('❌ Generic API error:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...options,
  });
};