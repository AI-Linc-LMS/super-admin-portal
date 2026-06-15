import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

export const useVimeoVideos = (params?: {
  search?: string;
  transcribed_only?: boolean;
  mapped?: 'all' | 'mapped' | 'unmapped';
  limit?: number;
  offset?: number;
}) => {
  return useQuery({
    queryKey: ['vimeo-videos', params],
    queryFn: () => apiService.getVimeoVideos(params),
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    keepPreviousData: true,
  });
};

export const useVimeoSyncStatus = () => {
  return useQuery({
    queryKey: ['vimeo-sync-status'],
    queryFn: () => apiService.getVimeoSyncStatus(),
    retry: false,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useTriggerVimeoSync = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (checkTextTracks?: boolean) => apiService.triggerVimeoSync(checkTextTracks),
    onSuccess: () => {
      // The sync runs async; nudge the status a few seconds later.
      setTimeout(() => qc.invalidateQueries({ queryKey: ['vimeo-sync-status'] }), 4000);
    },
  });
};

export const useVimeoFolders = () => {
  return useQuery({
    queryKey: ['vimeo-folders'],
    queryFn: () => apiService.getVimeoFolders(),
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useCreateVimeoFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiService.createVimeoFolder(name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vimeo-folders'] }),
  });
};

export const useFolderVideos = (projectId: string | null) => {
  return useQuery({
    queryKey: ['vimeo-folder-videos', projectId],
    queryFn: () => apiService.getFolderVideos(projectId as string),
    enabled: !!projectId,
    retry: false,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useMapVideosToModule = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      moduleId,
      vimeoIds,
      activate,
    }: {
      moduleId: number;
      vimeoIds: string[];
      activate?: boolean;
    }) => apiService.mapVideosToModule(moduleId, vimeoIds, activate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vimeo-videos'] });
      qc.invalidateQueries({ queryKey: ['vimeo-folder-videos'] });
      qc.invalidateQueries({ queryKey: ['adaptive-course-details'] });
    },
  });
};

export const useAddVideoToFolder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, vimeoId }: { projectId: string; vimeoId: string }) =>
      apiService.addVideoToVimeoFolder(projectId, vimeoId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vimeo-folders'] }),
  });
};

export const useCompleteVimeoUpload = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { vimeo_id: string; folder_id?: string }) =>
      apiService.completeVimeoUpload(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vimeo-videos'] });
      qc.invalidateQueries({ queryKey: ['vimeo-sync-status'] });
      qc.invalidateQueries({ queryKey: ['vimeo-folders'] });
    },
  });
};

export const useMapVimeoVideos = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      mappings,
      activate,
    }: {
      mappings: { vimeo_id: string; submodule_id: number }[];
      activate?: boolean;
    }) => apiService.mapVimeoVideos(mappings, activate),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vimeo-videos'] });
      qc.invalidateQueries({ queryKey: ['vimeo-folder-videos'] });
      qc.invalidateQueries({ queryKey: ['adaptive-course-details'] });
    },
  });
};
