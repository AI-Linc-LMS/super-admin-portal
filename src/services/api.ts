import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_ENDPOINTS, STORAGE_KEYS } from '../utils/constants';
import {
  Client,
  ClientDetails,
  PurgedClient,
  Feature,
  CourseOperationRequest,
  CourseOperationResponse,
  CourseOperationStatus,
  CourseOperationsList
} from '../types/client';
import {
  AdaptiveCourseSummary,
  AdaptiveCourseDetail,
  CourseTenantsResponse,
  AdaptiveJobSummary,
  AdaptiveJobDetail,
  AdaptiveModule,
  AdaptiveSubModule,
  TenantMapping,
} from '../types/adaptiveCourse';
import { AiTokenUsageParams, AiTokenUsageSummary } from '../types/aiTokenUsage';
import {
  PaymentsSummary,
  PaymentsSummaryParams,
  TenantsReport,
  LedgerPage,
  LedgerParams,
} from '../types/payments';
import type {
  CodingBankDetail,
  CodingBankItem,
  MCQBankItem,
  Paginated,
  QuestionBankListParams,
  QuestionBankStats,
} from '../types/questionBank';
import {
  VimeoVideoListResponse,
  VimeoSyncStatus,
  VimeoFolder,
  VimeoFolderVideosResponse,
  VimeoUploadTicket,
  VimeoVideoItem,
  VimeoMapResultItem,
  VimeoModuleMapResponse,
} from '../types/vimeo';
import toast from 'react-hot-toast';
import { B2CClientConfig, B2CConfigUpdate } from '../types/b2c';
import type { RepairPlan, RepairRequest } from '../types/clientPurge';

interface ApiError {
  message: string;
  status?: number;
  details?: any;
}

// Extend the Axios request config to include _retry property
interface RetryableAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    console.log('🔧 Initializing API Service with base URL:', API_BASE_URL);
    
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000, // 10 second timeout
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      console.log('📡 API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        baseURL: config.baseURL,
        fullURL: `${config.baseURL}${config.url}`,
        hasToken: !!token,
        params: config.params,
        data: config.data,
      });
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔐 Added authorization token to request');
      } else {
        console.warn('⚠️ No authorization token found');
      }
      
      return config;
    }, (error) => {
      console.error('❌ Request interceptor error:', error);
      return Promise.reject(error);
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ API Response:', {
          status: response.status,
          url: response.config.url,
          data: response.data,
        });
        return response;
      },
      async (error: AxiosError) => {
        console.error('❌ API Response Error:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });

        const originalRequest = error.config as RetryableAxiosRequestConfig;

        // Only attempt token refresh for 401 errors on non-auth endpoints
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          // Don't try to refresh token for login/refresh endpoints
          const isAuthEndpoint = originalRequest.url?.includes('/login') || originalRequest.url?.includes('/refresh');
          
          if (!isAuthEndpoint) {
            console.log('🔄 Attempting token refresh for 401 error...');
            originalRequest._retry = true;

            try {
              await this.refreshToken();
              const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
              if (token && originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                console.log('🔄 Retrying request with new token');
              }
              return this.api.request(originalRequest);
            } catch (refreshError) {
              console.error('❌ Token refresh failed:', refreshError);
              // The session is unrecoverable at this point and no later call will succeed either.
              // Keeping the operator on the page leaves a screen that still looks signed in while
              // every request behind it 401s, so an empty list reads as "there are no tenants"
              // rather than "you are logged out". Send them to login instead.
              this.handleAuthError();
              return Promise.reject(error);
            }
          } else {
            console.log('🚫 Not attempting token refresh for auth endpoint');
            // Login and refresh both render their own failure message, so a toast here doubles it.
            return Promise.reject(error);
          }
        }

        this.handleError(error);

        return Promise.reject(error);
      }
    );
  }

  private async refreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/accounts/token/refresh/`, {
        refresh: refreshToken,
      });

      const { access } = response.data;
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, access);
    } catch (error) {
      localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
      throw error;
    }
  }

  private handleAuthError(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    window.location.href = '/login';
  }

  private handleError(error: AxiosError): void {
    let message = 'An unexpected error occurred';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 400:
          message = data.message || 'Bad request';
          break;
        case 401:
          // Only reached once a refresh has already been tried and the retry 401'd too. Silence
          // here is what let an expired session look like a working one.
          message = 'Your session has expired. Please sign in again';
          break;
        case 403:
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          message = 'The requested resource was not found';
          break;
        case 500:
          message = 'Internal server error. Please try again later';
          break;
        default:
          message = data.message || `Error ${status}`;
      }
    } else if (error.request) {
      message = 'Network error. Please check your connection';
    }

    toast.error(message);
  }

  // Generic API methods
  async get<T>(url: string, params?: any): Promise<T> {
    console.log('🚀 Making GET request to:', url, 'with params:', params);
    const response = await this.api.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    console.log('🚀 Making POST request to:', url, 'with data:', data);
    const response = await this.api.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    console.log('🚀 Making PUT request to:', url, 'with data:', data);
    const response = await this.api.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    console.log('🚀 Making DELETE request to:', url);
    const response = await this.api.delete(url);
    return response.data;
  }

  async patch<T>(url: string, data?: any): Promise<T> {
    console.log('🚀 Making PATCH request to:', url, 'with data:', data);
    const response = await this.api.patch(url, data);
    return response.data;
  }

  // Client-specific API methods
  //
  // None of these catch the error and return hand-built data any more, the way the payments and
  // B2C methods below never did. The fallbacks were indistinguishable from a real response: a 403
  // on toggleClientStatus resolved with `{ message: "Client deactivated successfully" }`, the page
  // fired a success toast, and the tenant stayed active. deleteClient was worse, reporting a
  // finished tenant hard delete that never ran. A read fabricated its own version of the truth:
  // a timed-out client detail became "Demo Client" with 125 students. An operator cannot tell a
  // rejected write from an applied one, so let these throw and let the caller show the failure.
  async getClients(params?: any): Promise<Client[]> {
    const response = await this.get<Client[] | { results: Client[] }>('/superadmin/api/clients/', params);
    // The API now returns an array directly, not wrapped in a results object
    return Array.isArray(response) ? response : response.results || [];
  }

  async getClientDetails(id: number): Promise<ClientDetails> {
    return await this.get<ClientDetails>(`/superadmin/api/clients/${id}/`);
  }

  /**
   * Tenants that have actually been destroyed, from the purge audit trail.
   *
   * A second endpoint rather than a flag on getClients(), because there is nothing left to filter:
   * a purged tenant has no Client row at all, so these rows can only come from ClientPurge. Never
   * merge the two arrays. The shapes are different on purpose (superadmin_portal/serializers.py
   * ::PurgedClientSerializer emits no `id`), and a combined list is one map() away from building a
   * detail link to a tenant the database has forgotten.
   *
   * Only `completed` and `partial` purges come back. `refused` in particular is excluded server
   * side, which matters: a refused purge destroyed nothing and its tenant is still serving traffic,
   * so showing it here would tell an operator a live customer had been wiped.
   *
   * Same no-fallback rule as every method above: a failure throws so the page can say the list
   * failed. An invented empty graveyard reads as "we have never purged anyone".
   */
  async getPurgedClients(): Promise<PurgedClient[]> {
    // Tolerates a paginated wrapper the way getClients does, even though the view returns a bare
    // array today: the cost is one Array.isArray and the alternative is a blank page the day
    // somebody adds pagination to it.
    const response = await this.get<PurgedClient[] | { results: PurgedClient[] }>(
      '/superadmin/api/clients/purged/'
    );
    return Array.isArray(response) ? response : response.results || [];
  }

  async createClient(clientData: Partial<Client>) {
    const response = await this.post('/superadmin/api/clients/create/', clientData);
    console.log('✅ Client created successfully:', response);
    return response;
  }

  async updateClient(id: number, clientData: Partial<Client>, method: 'PUT' | 'PATCH' = 'PUT') {
    const endpoint = `/superadmin/api/clients/${id}/update/`;
    const response = method === 'PATCH'
      ? await this.patch(endpoint, clientData)
      : await this.put(endpoint, clientData);
    console.log(`✅ Client ${id} updated successfully:`, response);
    return response;
  }

  async toggleClientStatus(id: number, isActive: boolean) {
    // Use the existing update endpoint with PATCH method to update only is_active field
    const endpoint = `/superadmin/api/clients/${id}/update/`;
    const response = await this.patch(endpoint, { is_active: isActive });
    console.log(`✅ Client ${id} status toggled to ${isActive ? 'active' : 'inactive'}:`, response);
    return response;
  }

  async deleteClient(id: number) {
    return await this.delete(`/superadmin/api/clients/${id}/delete/`);
  }

  async changeUserRole(clientId: number, userId: number, newRole: string) {
    const endpoint = `/superadmin/api/clients/${clientId}/users/change-role/`;
    const response = await this.patch(endpoint, {
      user_id: userId,
      new_role: newRole
    });
    console.log(`✅ User ${userId} role changed to ${newRole} for client ${clientId}:`, response);
    return response;
  }

  async updateCourse(clientId: number, courseId: number, courseData: { price?: number; is_free?: boolean; published?: boolean; enrollment_enabled?: boolean; content_lock_enabled?: boolean; certificate_available?: boolean }) {
    const endpoint = `/superadmin/api/clients/${clientId}/courses/${courseId}/update/`;
    const response = await this.patch(endpoint, courseData);
    console.log(`✅ Course ${courseId} updated successfully for client ${clientId}:`, response);
    return response;
  }

  async assignCourseManager(clientId: number, courseId: number, userProfileId: number | null) {
    try {
      const endpoint = `/superadmin/api/clients/${clientId}/courses/${courseId}/course-manager/`;
      const response = await this.post<{
        message: string;
        client: { id: number; name: string; slug: string };
        course: { id: number; title: string; slug: string };
        previous_course_manager: { id: number; user_id: number; name: string; email: string; username?: string } | null;
        current_course_manager: { id: number; user_id: number; name: string; email: string; username?: string } | null;
        action: 'assigned' | 'changed' | 'unassigned' | 'no_change';
      }>(endpoint, { user_profile_id: userProfileId });
      console.log(`✅ Course manager assignment updated for course ${courseId} in client ${clientId}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Failed to assign course manager to course ${courseId}:`, error);
      throw error;
    }
  }

  async unassignCourseManager(clientId: number, courseId: number) {
    try {
      const endpoint = `/superadmin/api/clients/${clientId}/courses/${courseId}/course-manager/`;
      const response = await this.delete<{
        message: string;
        client: { id: number; name: string; slug: string };
        course: { id: number; title: string; slug: string };
        previous_course_manager: { id: number; user_id: number; name: string; email: string; username?: string } | null;
        current_course_manager: null;
        action: 'unassigned';
      }>(endpoint);
      console.log(`✅ Course manager unassigned from course ${courseId} in client ${clientId}:`, response);
      return response;
    } catch (error) {
      console.error(`❌ Failed to unassign course manager from course ${courseId}:`, error);
      throw error;
    }
  }

  // Features API methods
  //
  // Same no-fallback rule as the client methods above. The mock feature list was the worst of the
  // reads to fake: it named five features every tenant looked entitled to, so a failed fetch let
  // an operator grant or revoke against a list the backend had never confirmed.
  async getAvailableFeatures(): Promise<{ total_features: number; features: Feature[] }> {
    const response = await this.get<{ total_features: number; features: Feature[] }>('/accounts/features/');
    console.log('✅ Available features fetched:', response);
    return response;
  }

  async getClientFeatures(clientId: number): Promise<{ features: Feature[] }> {
    const endpoint = `/accounts/clients/${clientId}/features/select/`;
    const response = await this.get<{ features: Feature[] }>(endpoint);
    console.log(`✅ Client ${clientId} features fetched:`, response);
    return response;
  }

  async updateClientFeatures(clientId: number, featureIds: number[]): Promise<{ message: string; client: ClientDetails }> {
    const endpoint = `/accounts/clients/${clientId}/features/select/`;
    const response = await this.patch<{ message: string; client: ClientDetails }>(endpoint, {
      feature_ids: featureIds
    });
    console.log(`✅ Client ${clientId} features updated successfully:`, response);
    return response;
  }

  // Course Operations API methods
  //
  // Same no-fallback rule as the client methods above, and these needed it most: they are the only
  // methods here wired to a DESTRUCTIVE action. Every one of them used to catch the error and
  // resolve with a hand-built operation, so a 403 on delete returned
  // `{ message: "Course deletion initiated successfully", operation_id: "del_<random>" }`. The page
  // then polled that invented id, getOperationStatus rolled a RANDOM status out of
  // ['pending','in_progress','completed'], and on 'completed' the operator got a green
  // "Course deleted successfully!" toast and a page reload for a deletion that never ran. A
  // failed destructive operation has to look failed, so let these throw.
  async duplicateCourse(request: CourseOperationRequest): Promise<CourseOperationResponse> {
    const response = await this.post<CourseOperationResponse>('/lms/course-operations/duplicate/', request);
    console.log('✅ Course duplication initiated:', response);
    return response;
  }

  async bulkDuplicateCourses(request: CourseOperationRequest): Promise<CourseOperationResponse> {
    const response = await this.post<CourseOperationResponse>('/lms/course-operations/bulk-duplicate/', request);
    console.log('✅ Bulk course duplication initiated:', response);
    return response;
  }

  async deleteCourse(request: CourseOperationRequest): Promise<CourseOperationResponse> {
    const response = await this.post<CourseOperationResponse>('/lms/course-operations/delete/', request);
    console.log('✅ Course deletion initiated:', response);
    return response;
  }

  // The status poller decides whether the UI declares an operation done, so this is the last place
  // that may guess. Reporting 'completed' because the poll itself failed is how a destructive
  // operation gets announced as finished without ever having started.
  async getOperationStatus(operationId: string): Promise<CourseOperationStatus> {
    const response = await this.get<CourseOperationStatus>(`/lms/course-operations/${operationId}/status/`);
    console.log(`✅ Operation status fetched for ${operationId}:`, response);
    return response;
  }

  async getOperationsList(params?: { 
    type?: string; 
    status?: string; 
    limit?: number; 
    offset?: number; 
  }): Promise<CourseOperationsList> {
    const response = await this.get<CourseOperationsList>('/lms/course-operations/', params);
    console.log('✅ Operations list fetched:', response);
    return response;
  }

  // ---------- AI token/cost usage (cross-tenant) ----------

  async getAiTokenUsage(params?: AiTokenUsageParams): Promise<AiTokenUsageSummary> {
    return await this.get<AiTokenUsageSummary>(API_ENDPOINTS.AI_TOKEN_USAGE, params);
  }

  // ---------- Payments (cross-tenant) ----------
  //
  // These three deliberately have no catch-and-return-demo-data fallback. The client-detail call
  // used to, and it produced a `total_revenue: 15600` that read as real for a tenant whose request
  // had simply timed out. Inventing revenue is worse than showing an error. No method in this file
  // has such a fallback any more; do not be the one to add the next.

  async getPaymentsSummary(params?: PaymentsSummaryParams): Promise<PaymentsSummary> {
    return await this.get<PaymentsSummary>(API_ENDPOINTS.PAYMENTS_SUMMARY, params);
  }

  async getPaymentsTenants(): Promise<TenantsReport> {
    return await this.get<TenantsReport>(API_ENDPOINTS.PAYMENTS_TENANTS);
  }

  async getPaymentsLedger(params?: LedgerParams): Promise<LedgerPage> {
    return await this.get<LedgerPage>(API_ENDPOINTS.PAYMENTS_LEDGER, params);
  }

  // ---------- Adaptive Courses (cross-tenant) ----------

  async getAdaptiveCourses(params?: {
    client_id?: number;
    is_template?: boolean;
    search?: string;
  }): Promise<AdaptiveCourseSummary[]> {
    const response = await this.get<AdaptiveCourseSummary[] | { results: AdaptiveCourseSummary[] }>(
      API_ENDPOINTS.ADAPTIVE_COURSES,
      params
    );
    return Array.isArray(response) ? response : response.results || [];
  }

  async getAdaptiveCourseDetails(id: number): Promise<AdaptiveCourseDetail> {
    return await this.get<AdaptiveCourseDetail>(API_ENDPOINTS.ADAPTIVE_COURSE_DETAILS(id));
  }

  async getAdaptiveCourseTenants(id: number): Promise<CourseTenantsResponse> {
    return await this.get<CourseTenantsResponse>(API_ENDPOINTS.ADAPTIVE_COURSE_TENANTS(id));
  }

  async getAdaptiveJobs(params?: { client_id?: number }): Promise<AdaptiveJobSummary[]> {
    const response = await this.get<AdaptiveJobSummary[] | { results: AdaptiveJobSummary[] }>(
      API_ENDPOINTS.ADAPTIVE_JOBS,
      params
    );
    return Array.isArray(response) ? response : response.results || [];
  }

  async getAdaptiveJobDetails(jobId: string): Promise<AdaptiveJobDetail> {
    return await this.get<AdaptiveJobDetail>(API_ENDPOINTS.ADAPTIVE_JOB_DETAILS(jobId));
  }

  async createAdaptiveModule(
    courseId: number,
    payload: { title: string; weekno?: number }
  ): Promise<AdaptiveModule> {
    return await this.post<AdaptiveModule>(API_ENDPOINTS.ADAPTIVE_MODULE_CREATE(courseId), payload);
  }

  async createAdaptiveSubmodule(
    moduleId: number,
    payload: { title: string; description?: string }
  ): Promise<AdaptiveSubModule> {
    return await this.post<AdaptiveSubModule>(
      API_ENDPOINTS.ADAPTIVE_SUBMODULE_CREATE(moduleId),
      payload
    );
  }

  async mapAdaptiveCourse(
    courseId: number,
    payload: { client_id: number; mode: 'clone' | 'shared' }
  ): Promise<any> {
    return await this.post(API_ENDPOINTS.ADAPTIVE_COURSE_MAP(courseId), payload);
  }

  /** Set what a tenant charges for a SHARED catalog course. Clone mode is refused server-side. */
  async priceAdaptiveCourseMapping(
    courseId: number,
    mappingId: number,
    payload: { is_paid: boolean; price?: string | null; currency?: string },
  ): Promise<TenantMapping> {
    return await this.patch<TenantMapping>(
      API_ENDPOINTS.ADAPTIVE_COURSE_UNMAP(courseId, mappingId),
      payload,
    );
  }

  async unmapAdaptiveCourse(
    courseId: number,
    mappingId: number,
    deleteClone = false
  ): Promise<any> {
    const suffix = deleteClone ? '?delete_clone=true' : '';
    return await this.delete(`${API_ENDPOINTS.ADAPTIVE_COURSE_UNMAP(courseId, mappingId)}${suffix}`);
  }

  // ---------- Vimeo library (cross-tenant) ----------

  async getVimeoVideos(params?: {
    search?: string;
    transcribed_only?: boolean;
    mapped?: 'all' | 'mapped' | 'unmapped';
    limit?: number;
    offset?: number;
  }): Promise<VimeoVideoListResponse> {
    return await this.get<VimeoVideoListResponse>(API_ENDPOINTS.VIMEO_VIDEOS, params);
  }

  async getVimeoSyncStatus(): Promise<VimeoSyncStatus> {
    return await this.get<VimeoSyncStatus>(API_ENDPOINTS.VIMEO_SYNC_STATUS);
  }

  async triggerVimeoSync(checkTextTracks = true): Promise<{ status: string }> {
    return await this.post(API_ENDPOINTS.VIMEO_SYNC, { check_text_tracks: checkTextTracks });
  }

  async getVimeoFolders(): Promise<{ results: VimeoFolder[] }> {
    return await this.get<{ results: VimeoFolder[] }>(API_ENDPOINTS.VIMEO_FOLDERS);
  }

  async getFolderVideos(projectId: string): Promise<VimeoFolderVideosResponse> {
    return await this.get<VimeoFolderVideosResponse>(API_ENDPOINTS.VIMEO_FOLDER_VIDEOS(projectId));
  }

  async mapVideosToModule(
    moduleId: number,
    vimeoIds: string[],
    activate = false
  ): Promise<VimeoModuleMapResponse> {
    return await this.post(API_ENDPOINTS.VIMEO_MAP_TO_MODULE(moduleId), {
      vimeo_ids: vimeoIds,
      activate,
    });
  }

  async createVimeoFolder(name: string): Promise<VimeoFolder> {
    return await this.post<VimeoFolder>(API_ENDPOINTS.VIMEO_FOLDERS, { name });
  }

  async addVideoToVimeoFolder(projectId: string, vimeoId: string): Promise<any> {
    return await this.post(API_ENDPOINTS.VIMEO_FOLDER_ADD_VIDEO(projectId), { vimeo_id: vimeoId });
  }

  async createVimeoUpload(payload: {
    name: string;
    size: number;
    description?: string;
  }): Promise<VimeoUploadTicket> {
    return await this.post<VimeoUploadTicket>(API_ENDPOINTS.VIMEO_UPLOAD_CREATE, payload);
  }

  async completeVimeoUpload(payload: { vimeo_id: string; folder_id?: string }): Promise<VimeoVideoItem> {
    return await this.post<VimeoVideoItem>(API_ENDPOINTS.VIMEO_UPLOAD_COMPLETE, payload);
  }

  async mapVimeoVideos(
    mappings: { vimeo_id: string; submodule_id: number }[],
    activate = false
  ): Promise<{ results: VimeoMapResultItem[] }> {
    return await this.post(API_ENDPOINTS.VIMEO_MAP, { mappings, activate });
  }

  // ---------- Question bank (cross-tenant coding + MCQ) ----------

  async getQuestionBankStats(): Promise<QuestionBankStats> {
    return await this.get<QuestionBankStats>(API_ENDPOINTS.QUESTION_BANK_STATS);
  }

  async getQuestionBankMcqs(params?: QuestionBankListParams): Promise<Paginated<MCQBankItem>> {
    return await this.get<Paginated<MCQBankItem>>(API_ENDPOINTS.QUESTION_BANK_MCQS, params);
  }

  async getQuestionBankMcqDetail(id: number): Promise<MCQBankItem> {
    return await this.get<MCQBankItem>(API_ENDPOINTS.QUESTION_BANK_MCQ_DETAILS(id));
  }

  async getQuestionBankCoding(params?: QuestionBankListParams): Promise<Paginated<CodingBankItem>> {
    return await this.get<Paginated<CodingBankItem>>(API_ENDPOINTS.QUESTION_BANK_CODING, params);
  }

  async getQuestionBankCodingDetail(id: number): Promise<CodingBankDetail> {
    return await this.get<CodingBankDetail>(API_ENDPOINTS.QUESTION_BANK_CODING_DETAILS(id));
  }

  // ---- B2C mode -------------------------------------------------------------------------- //
  // Deliberately NO mock-data fallback, which most methods above once had. These describe whether a
  // tenant charges learners money. Swapping in fabricated data when the API errors would show
  // "B2C off / 1 free course" for a tenant whose real state is unknown, and an operator would
  // act on it — the same failure that made a real backend bug look like a placeholder client.
  // Let it throw; the panel renders the error.
  async getB2CConfig(clientId: number): Promise<B2CClientConfig> {
    return await this.get<B2CClientConfig>(`/superadmin/api/b2c/clients/${clientId}/`);
  }

  async updateB2CConfig(clientId: number, payload: B2CConfigUpdate): Promise<B2CClientConfig> {
    return await this.patch<B2CClientConfig>(`/superadmin/api/b2c/clients/${clientId}/`, payload);
  }

  // ---- Cross-tenant purge repair --------------------------------------------------------- //
  // The way out of a cross_tenant_cascade refusal, which is otherwise a dead end in the portal.
  // ONE endpoint with two meanings: `execute: false` reads and writes nothing, `execute: true`
  // re-homes the rows the plan marked. The caller must always show the plan before sending the
  // second one, so `execute` is a required argument here rather than defaulting to anything: a
  // repair that mutates because a parameter was left off is exactly the accident this shape
  // prevents. Errors are left to throw, like the B2C and payments methods above and unlike the
  // older client methods: this mutates rows belonging to OTHER live tenants, and a fabricated
  // "nothing to do" on a failed request would tell an operator the crossing is clean when it is
  // not.
  async repairCrossTenant(clientId: number, payload: RepairRequest): Promise<RepairPlan> {
    return await this.post<RepairPlan>(
      `/superadmin/api/clients/${clientId}/purge/repair-cross-tenant/`,
      payload
    );
  }
}

export const apiService = new ApiService();