import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import {
  ApproveRequestPayload,
  RejectRequestPayload,
  SubdomainCheckResponse,
  TenantRequestDetail,
  TenantRequestListItem,
  TenantRequestStatus,
} from '../types/tenantRequest';

const BASE = '/superadmin/api/provisioning-requests/';

export const useTenantRequests = (
  filters: { status?: TenantRequestStatus | 'all'; search?: string } = {}
) => {
  return useQuery({
    queryKey: ['tenant-requests', filters],
    queryFn: async (): Promise<TenantRequestListItem[]> => {
      const params: Record<string, string> = {};
      if (filters.status && filters.status !== 'all') {
        params.status = filters.status;
      }
      if (filters.search) params.search = filters.search;
      return apiService.get<TenantRequestListItem[]>(BASE, params);
    },
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useTenantRequest = (id: number | null) => {
  return useQuery({
    queryKey: ['tenant-request', id],
    queryFn: async (): Promise<TenantRequestDetail> =>
      apiService.get<TenantRequestDetail>(`${BASE}${id}/`),
    enabled: !!id,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCheckSubdomain = () => {
  return useMutation({
    mutationFn: async (name: string): Promise<SubdomainCheckResponse> =>
      apiService.get<SubdomainCheckResponse>(`${BASE}check-subdomain/`, {
        name,
      }),
  });
};

export const useApproveTenantRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: ApproveRequestPayload;
    }): Promise<TenantRequestDetail> =>
      apiService.post<TenantRequestDetail>(`${BASE}${id}/approve/`, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-requests'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-request', id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
};

export const useRejectTenantRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: number;
      payload: RejectRequestPayload;
    }): Promise<TenantRequestDetail> =>
      apiService.post<TenantRequestDetail>(`${BASE}${id}/reject/`, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-requests'] });
      queryClient.invalidateQueries({ queryKey: ['tenant-request', id] });
    },
  });
};
