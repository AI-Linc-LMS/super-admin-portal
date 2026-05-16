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

export const useTenantRequest = (
  id: number | null,
  options: { pollWhileProvisioning?: boolean } = {}
) => {
  return useQuery({
    queryKey: ['tenant-request', id],
    queryFn: async (): Promise<TenantRequestDetail> =>
      apiService.get<TenantRequestDetail>(`${BASE}${id}/`),
    enabled: !!id,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    // Always refetch when the modal mounts. Prevents a 60s-stale `pending_review`
    // status from showing the Approve button after the request was approved
    // elsewhere (other tab, direct API call, or a previous mutation that
    // didn't invalidate this entry). The list-query staleTime is unaffected.
    refetchOnMount: 'always',
    refetchInterval: options.pollWhileProvisioning
      ? (data) => {
          const status = (data as TenantRequestDetail | undefined)?.provisioning?.status;
          return status === 'in_progress' || status === 'pending' ? 3000 : false;
        }
      : false,
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

export const useRetryProvisioning = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<TenantRequestDetail> =>
      apiService.post<TenantRequestDetail>(
        `${BASE}${id}/retry-provisioning/`,
        {}
      ),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['tenant-request', id] });
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
