import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../services/api';

export const useAdaptiveCourses = (params?: {
  client_id?: number;
  is_template?: boolean;
  search?: string;
}) => {
  return useQuery({
    queryKey: ['adaptive-courses', params],
    queryFn: () => apiService.getAdaptiveCourses(params),
    retry: false,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useAdaptiveCourseDetails = (courseId: number) => {
  return useQuery({
    queryKey: ['adaptive-course-details', courseId],
    queryFn: () => apiService.getAdaptiveCourseDetails(courseId),
    enabled: !!courseId,
    retry: false,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
};

export const useAdaptiveCourseTenants = (courseId: number, enabled = true) => {
  return useQuery({
    queryKey: ['adaptive-course-tenants', courseId],
    queryFn: () => apiService.getAdaptiveCourseTenants(courseId),
    enabled: enabled && !!courseId,
    retry: false,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useAdaptiveJobs = (params?: { client_id?: number }) => {
  return useQuery({
    queryKey: ['adaptive-jobs', params],
    queryFn: () => apiService.getAdaptiveJobs(params),
    retry: false,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

export const useMapAdaptiveCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      clientId,
      mode,
    }: {
      courseId: number;
      clientId: number;
      mode: 'clone' | 'shared';
    }) => apiService.mapAdaptiveCourse(courseId, { client_id: clientId, mode }),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['adaptive-course-tenants', courseId] });
      queryClient.invalidateQueries({ queryKey: ['adaptive-course-details', courseId] });
      queryClient.invalidateQueries({ queryKey: ['adaptive-courses'] });
    },
  });
};

export const useUnmapAdaptiveCourse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      mappingId,
      deleteClone,
    }: {
      courseId: number;
      mappingId: number;
      deleteClone?: boolean;
    }) => apiService.unmapAdaptiveCourse(courseId, mappingId, deleteClone),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['adaptive-course-tenants', courseId] });
      queryClient.invalidateQueries({ queryKey: ['adaptive-courses'] });
    },
  });
};

export const useCreateAdaptiveModule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      courseId,
      title,
      weekno,
    }: {
      courseId: number;
      title: string;
      weekno?: number;
    }) => apiService.createAdaptiveModule(courseId, { title, weekno }),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['adaptive-course-details', courseId] });
    },
  });
};

export const useCreateAdaptiveSubmodule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      moduleId,
      title,
      description,
    }: {
      moduleId: number;
      courseId: number;
      title: string;
      description?: string;
    }) => apiService.createAdaptiveSubmodule(moduleId, { title, description }),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['adaptive-course-details', courseId] });
    },
  });
};

export const useAdaptiveJobDetails = (jobId: string, enabled = true) => {
  return useQuery({
    queryKey: ['adaptive-job-details', jobId],
    queryFn: () => apiService.getAdaptiveJobDetails(jobId),
    enabled: enabled && !!jobId,
    retry: false,
    // Poll while the job is still running.
    refetchInterval: (data) => {
      if (data && ['completed', 'failed'].includes(data.status)) return false;
      return 3000;
    },
  });
};
