import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';
import type {
  DeleteFilesPayload,
  DeleteFilesResponse,
  FileAuditListResponse,
  FileCategory,
  FileListResponse,
} from '../types/clientFiles';

const baseUrl = (clientId: number) =>
  `/superadmin/api/clients/${clientId}/files/`;

export const useFileCategories = (clientId: number, options?: { enabled?: boolean }) =>
  useQuery({
    queryKey: ['client-files', 'categories', clientId],
    queryFn: () =>
      apiService.get<FileCategory[]>(`${baseUrl(clientId)}categories/`),
    enabled: options?.enabled ?? true,
    retry: false,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });

export const useFileList = (
  clientId: number,
  prefix: string | null,
  continuationToken: string | null,
  search: string,
) =>
  useQuery({
    queryKey: ['client-files', 'list', clientId, prefix, continuationToken, search],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (prefix) params.prefix = prefix;
      if (continuationToken) params.continuation_token = continuationToken;
      if (search) params.search = search;
      params.page_size = '50';
      return apiService.get<FileListResponse>(baseUrl(clientId), params);
    },
    enabled: Boolean(prefix),
    retry: false,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
  });

export const useDeleteFiles = (clientId: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: DeleteFilesPayload) =>
      apiService.post<DeleteFilesResponse>(
        `${baseUrl(clientId)}delete/`,
        payload,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-files', 'list', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-files', 'categories', clientId] });
      queryClient.invalidateQueries({ queryKey: ['client-files', 'audit', clientId] });
    },
  });
};

export const useFileAudit = (
  clientId: number,
  page: number,
  options?: { enabled?: boolean },
) =>
  useQuery({
    queryKey: ['client-files', 'audit', clientId, page],
    queryFn: () =>
      apiService.get<FileAuditListResponse>(`${baseUrl(clientId)}audit/`, {
        page,
      }),
    enabled: options?.enabled ?? true,
    retry: false,
    refetchOnWindowFocus: false,
  });
