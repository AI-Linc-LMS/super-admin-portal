import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiService } from '../services/api';
import {
  CourseRequestBrief,
  CourseRequestDetail,
  CourseRequestListResponse,
  CourseRequestStatus,
} from '../types/courseRequest';

const BASE = '/superadmin/api/adaptive/course-requests/';

export const useCourseRequests = (
  filters: { status?: CourseRequestStatus | 'all'; clientId?: number } = {}
) => {
  return useQuery({
    queryKey: ['course-requests', filters],
    queryFn: async (): Promise<CourseRequestListResponse> => {
      const params: Record<string, string> = {};
      // The backend already defaults to `pending` — the working set. Sending it explicitly keeps
      // the query key and the request honest about what is being shown.
      params.approval_status = filters.status ?? 'pending';
      if (filters.clientId) params.client = String(filters.clientId);
      return apiService.get<CourseRequestListResponse>(BASE, params);
    },
    retry: false,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });
};

export const useCourseRequest = (id: number | null) => {
  return useQuery({
    queryKey: ['course-request', id],
    queryFn: async (): Promise<CourseRequestDetail> =>
      apiService.get<CourseRequestDetail>(`${BASE}${id}/`),
    enabled: !!id,
    retry: false,
    // Always refetch on mount: a 30s-stale `pending` would offer Approve on a request another
    // super admin already decided, and approving twice is a wasted full-course build.
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
};

/** Everything that mutates a request invalidates both the row and the queue. */
function useRequestMutation<TArgs extends { id: number }>(
  fn: (args: TArgs) => Promise<CourseRequestDetail>
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_data, variables) => {
      void qc.invalidateQueries({ queryKey: ['course-requests'] });
      void qc.invalidateQueries({ queryKey: ['course-request', variables.id] });
    },
  });
}

/** Trim the ask before approving — 20 weeks into 6 — rather than only saying yes or no. */
export const useEditCourseRequest = () =>
  useRequestMutation<{ id: number; brief: Partial<CourseRequestBrief> }>(({ id, brief }) =>
    apiService.patch<CourseRequestDetail>(`${BASE}${id}/`, brief)
  );

/** The only place platform LLM spend on a full course is authorised. */
export const useApproveCourseRequest = () =>
  useRequestMutation<{ id: number; note?: string }>(({ id, note }) =>
    apiService.post<CourseRequestDetail>(`${BASE}${id}/approve/`, { note: note ?? '' })
  );

export const useRejectCourseRequest = () =>
  useRequestMutation<{ id: number; note: string }>(({ id, note }) =>
    apiService.post<CourseRequestDetail>(`${BASE}${id}/reject/`, { note })
  );
