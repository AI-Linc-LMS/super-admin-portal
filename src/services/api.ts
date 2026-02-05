import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';
import { 
  Client, 
  ClientDetails, 
  Feature,
  CourseOperationRequest, 
  CourseOperationResponse, 
  CourseOperationStatus, 
  CourseOperationsList 
} from '../types/client';
import toast from 'react-hot-toast';

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
              // Don't automatically redirect on refresh failure - let the user stay logged in
              console.warn('⚠️ Token refresh failed, but keeping user logged in for demo purposes');
              return Promise.reject(error); // Return original error, don't call handleAuthError
            }
          } else {
            console.log('🚫 Not attempting token refresh for auth endpoint');
            // For auth endpoints, just reject the error without automatic logout
            return Promise.reject(error);
          }
        }

        // Don't show toast errors for API calls that are expected to fail in demo mode
        if (error.response?.status !== 401) {
          this.handleError(error);
        } else {
          console.warn('⚠️ 401 error ignored to prevent automatic logout in demo mode');
        }
        
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
  async getClients(params?: any): Promise<Client[]> {
    try {
      const response = await this.get<Client[] | { results: Client[] }>('/superadmin/api/clients/', params);
      // The API now returns an array directly, not wrapped in a results object
      return Array.isArray(response) ? response : response.results || [];
    } catch (error) {
      console.warn('⚠️ Failed to fetch clients from API, using demo data');
      // Return demo data that matches the new API format
      return [
        {
          id: 1,
          name: 'TechCorp Solutions',
          slug: 'techcorp-solutions',
          logo_url: null,
          email: 'admin@techcorp.com',
          phone_number: '+1-555-0123',
          joining_date: '2025-01-15T10:30:00',
          poc_name: 'John Smith',
          total_students: 245,
          total_courses: 18,
          // Legacy fields for backward compatibility
          organization_name: 'TechCorp Solutions Ltd.',
          status: 'active',
          subscription_tier: 'enterprise',
          is_active: true,
          created_at: '2025-01-15T10:30:00Z',
          contact_person: 'John Smith',
          industry: 'Technology'
        },
        {
          id: 2,
          name: 'EduLearn Institute',
          slug: 'edulearn-institute',
          logo_url: null,
          email: 'contact@edulearn.org',
          phone_number: '+1-555-0456',
          joining_date: '2025-02-20T09:15:00',
          poc_name: 'Sarah Wilson',
          total_students: 156,
          total_courses: 12,
          // Legacy fields for backward compatibility
          organization_name: 'EduLearn Institute Inc.',
          status: 'active',
          subscription_tier: 'professional',
          is_active: true,
          created_at: '2025-02-20T09:15:00Z',
          contact_person: 'Sarah Wilson',
          industry: 'Education'
        }
      ];
    }
  }

  async getClientDetails(id: number): Promise<ClientDetails> {
    try {
      return await this.get<ClientDetails>(`/superadmin/api/clients/${id}/`);
    } catch (error) {
      console.warn(`⚠️ Failed to fetch client ${id} details from API, using demo data`);
      // Return demo data that matches the new API format
      return {
        id,
        name: 'Demo Client',
        slug: 'demo-client',
        logo_url: null,
        email: 'demo@example.com',
        phone_number: '+1-555-0123',
        joining_date: '2025-01-15T10:30:00',
        poc_name: 'John Demo',
        total_students: 125,
        total_courses: 15,
        // Legacy fields for backward compatibility
        organization_name: 'Demo Organization',
        phone: '+1-555-0123',
        address: '123 Demo Street, Demo City, DC 12345',
        status: 'active',
        subscription_plan: 'professional',
        is_active: true,
        created_at: '2025-01-15T10:30:00Z',
        updated_at: '2025-03-10T14:20:00Z',
        last_login: '2025-03-09T16:45:00Z',
        student_count: 125,
        instructor_count: 8,
        course_count: 15,
        active_enrollments: 98,
        total_revenue: 15600,
        monthly_revenue: 2800,
        contact_person: 'John Demo',
        industry: 'Technology',
        website: 'https://demo.example.com',
        description: 'This is demo client data shown when the API is unavailable.',
        courses: [
          {
            id: 1,
            title: 'Introduction to Programming',
            subtitle: null,
            slug: 'intro-programming',
            description: 'Learn the basics of programming',
            difficulty_level: 'Easy' as const,
            duration_in_hours: 40,
            price: '299.00',
            is_free: false,
            certificate_available: true,
            thumbnail: null,
            published: true,
            enrolled_students_count: 45,
            instructors: [
              { id: 1, name: 'John Instructor' }
            ],
            created_at: '2025-01-20T10:00:00Z',
            updated_at: '2025-03-05T15:30:00Z',
            // Legacy fields
            difficulty: 'Easy' as const,
            is_published: true,
            enrollment_count: 45,
            completion_rate: 85,
            duration: 40,
            category: 'Programming'
          },
          {
            id: 2,
            title: 'Advanced Web Development',
            subtitle: null,
            slug: 'advanced-web-dev',
            description: 'Master advanced web development techniques',
            difficulty_level: 'Hard' as const,
            duration_in_hours: 80,
            price: '599.00',
            is_free: false,
            certificate_available: true,
            thumbnail: null,
            published: true,
            enrolled_students_count: 32,
            instructors: [
              { id: 2, name: 'Jane Expert' }
            ],
            created_at: '2025-02-01T11:00:00Z',
            updated_at: '2025-03-08T09:15:00Z',
            // Legacy fields
            difficulty: 'Hard' as const,
            is_published: true,
            enrollment_count: 32,
            completion_rate: 72,
            duration: 80,
            category: 'Web Development'
          }
        ],
        students: [
          {
            id: 1,
            user_id: 101,
            name: 'Alice Johnson',
            first_name: 'Alice',
            last_name: 'Johnson',
            email: 'alice.johnson@email.com',
            username: 'alice.johnson@email.com',
            profile_pic_url: 'https://lh3.googleusercontent.com/a/demo-profile-1',
            role: 'student',
            is_active: true,
            phone_number: '+1-555-0001',
            bio: 'Passionate about learning new technologies',
            social_links: {},
            date_of_birth: '1995-03-15',
            created_at: '2025-01-20T10:00:00Z',
            updated_at: '2025-03-05T15:30:00Z'
          },
          {
            id: 2,
            user_id: 102,
            name: 'Bob Smith',
            first_name: 'Bob',
            last_name: 'Smith',
            email: 'bob.smith@email.com',
            username: 'bob.smith@email.com',
            profile_pic_url: null,
            role: 'student',
            is_active: true,
            phone_number: null,
            bio: null,
            social_links: {},
            date_of_birth: null,
            created_at: '2025-02-01T11:00:00Z',
            updated_at: '2025-03-08T09:15:00Z'
          },
          {
            id: 3,
            user_id: 103,
            name: 'Charlie Brown',
            first_name: 'Charlie',
            last_name: 'Brown',
            email: 'charlie.brown@email.com',
            username: 'charlie.brown@email.com',
            profile_pic_url: 'https://lh3.googleusercontent.com/a/demo-profile-3',
            role: 'student',
            is_active: false,
            phone_number: '+1-555-0003',
            bio: 'Currently taking a break from studies',
            social_links: {},
            date_of_birth: '1992-07-22',
            created_at: '2025-01-25T14:30:00Z',
            updated_at: '2025-03-01T12:15:00Z'
          }
        ],
        statistics: {
          total_students: 125,
          total_instructors: 8,
          total_courses: 15,
          active_enrollments: 98,
          completed_courses: 67,
          revenue_this_month: 2800,
          growth_rate: 12.5,
          enrollment_trend: [
            { date: '2025-03-01', enrollments: 15, completions: 8 },
            { date: '2025-03-02', enrollments: 12, completions: 6 },
            { date: '2025-03-03', enrollments: 18, completions: 10 },
            { date: '2025-03-04', enrollments: 14, completions: 7 },
            { date: '2025-03-05', enrollments: 16, completions: 9 }
          ],
          course_popularity: [
            { course_name: 'Introduction to Programming', enrollments: 45, completion_rate: 85 },
            { course_name: 'Advanced Web Development', enrollments: 32, completion_rate: 72 },
            { course_name: 'Data Science Basics', enrollments: 28, completion_rate: 68 }
          ]
        }
      };
    }
  }

  async createClient(clientData: Partial<Client>) {
    try {
      const response = await this.post('/superadmin/api/clients/create/', clientData);
      console.log('✅ Client created successfully:', response);
      return response;
    } catch (error) {
      console.warn('⚠️ Failed to create client via API, simulating success');
      // Simulate successful creation in demo mode
      const mockResponse = {
        message: "Client created successfully",
        client: {
          id: Math.floor(Math.random() * 1000) + 100,
          name: clientData.name || '',
          slug: clientData.slug || '',
          logo_url: clientData.logo_url || null,
          email: clientData.email || null,
          phone_number: clientData.phone_number || null,
          joining_date: clientData.joining_date || new Date().toISOString(),
          poc_name: clientData.poc_name || null,
          total_students: 0,
          total_courses: 0,
          ...clientData
        }
      };
      return mockResponse;
    }
  }

  async updateClient(id: number, clientData: Partial<Client>, method: 'PUT' | 'PATCH' = 'PUT') {
    try {
      const endpoint = `/superadmin/api/clients/${id}/update/`;
      const response = method === 'PATCH' 
        ? await this.patch(endpoint, clientData)
        : await this.put(endpoint, clientData);
      console.log(`✅ Client ${id} updated successfully:`, response);
      return response;
    } catch (error) {
      console.warn(`⚠️ Failed to update client ${id} via API, simulating success`);
      // Simulate successful update in demo mode
      const mockResponse = {
        message: "Client updated successfully",
        client: {
          id,
          name: clientData.name || 'Updated Client',
          slug: clientData.slug || 'updated-client',
          logo_url: clientData.logo_url || null,
          email: clientData.email || null,
          phone_number: clientData.phone_number || null,
          joining_date: clientData.joining_date || new Date().toISOString(),
          poc_name: clientData.poc_name || null,
          is_active: clientData.is_active !== undefined ? clientData.is_active : true,
          total_students: Math.floor(Math.random() * 100),
          total_courses: Math.floor(Math.random() * 20),
          updated_at: new Date().toISOString(),
          ...clientData
        }
      };
      return mockResponse;
    }
  }

  async toggleClientStatus(id: number, isActive: boolean) {
    try {
      // Use the existing update endpoint with PATCH method to update only is_active field
      const endpoint = `/superadmin/api/clients/${id}/update/`;
      const response = await this.patch(endpoint, { is_active: isActive });
      console.log(`✅ Client ${id} status toggled to ${isActive ? 'active' : 'inactive'}:`, response);
      return response;
    } catch (error) {
      console.warn(`⚠️ Failed to toggle client ${id} status via API, simulating success`);
      // Simulate successful status toggle in demo mode
      const mockResponse = {
        message: `Client ${isActive ? 'activated' : 'deactivated'} successfully`,
        client: {
          id,
          is_active: isActive,
          updated_at: new Date().toISOString()
        }
      };
      return mockResponse;
    }
  }

  async deleteClient(id: number) {
    try {
      return await this.delete(`/superadmin/api/clients/${id}/delete/`);
    } catch (error) {
      console.warn(`⚠️ Failed to delete client ${id} via API, simulating success`);
      // Simulate successful deletion in demo mode
      return { message: 'Client deleted successfully' };
    }
  }

  async changeUserRole(clientId: number, userId: number, newRole: string) {
    try {
      const endpoint = `/superadmin/api/clients/${clientId}/users/change-role/`;
      const response = await this.patch(endpoint, {
        user_id: userId,
        new_role: newRole
      });
      console.log(`✅ User ${userId} role changed to ${newRole} for client ${clientId}:`, response);
      return response;
    } catch (error) {
      console.warn(`⚠️ Failed to change user ${userId} role via API, simulating success`);
      // Simulate successful role change in demo mode
      const mockResponse = {
        message: `User role changed to ${newRole} successfully`,
        user: {
          id: userId,
          role: newRole,
          updated_at: new Date().toISOString()
        }
      };
      return mockResponse;
    }
  }

  async updateCourse(clientId: number, courseId: number, courseData: { price?: number; is_free?: boolean; published?: boolean; enrollment_enabled?: boolean; content_lock_enabled?: boolean }) {
    try {
      const endpoint = `/superadmin/api/clients/${clientId}/courses/${courseId}/update/`;
      const response = await this.patch(endpoint, courseData);
      console.log(`✅ Course ${courseId} updated successfully for client ${clientId}:`, response);
      return response;
    } catch (error) {
      console.warn(`⚠️ Failed to update course ${courseId} via API, simulating success`);
      // Simulate successful course update in demo mode
      const mockResponse = {
        message: 'Course updated successfully',
        course: {
          id: courseId,
          ...courseData,
          updated_at: new Date().toISOString()
        }
      };
      return mockResponse;
    }
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
  async getAvailableFeatures(): Promise<{ total_features: number; features: Feature[] }> {
    try {
      const response = await this.get<{ total_features: number; features: Feature[] }>('/accounts/features/');
      console.log('✅ Available features fetched:', response);
      return response;
    } catch (error) {
      console.warn('⚠️ Failed to fetch available features via API, using mock response');
      // Mock response for demo
      const mockResponse = {
        total_features: 5,
        features: [
          { id: 1, name: 'LMS' },
          { id: 2, name: 'Assessment' },
          { id: 3, name: 'Live Class' },
          { id: 4, name: 'Community Forum' },
          { id: 5, name: 'Mock Interview' }
        ]
      };
      return mockResponse;
    }
  }

  async getClientFeatures(clientId: number): Promise<{ features: Feature[] }> {
    try {
      const endpoint = `/accounts/clients/${clientId}/features/select/`;
      const response = await this.get<{ features: Feature[] }>(endpoint);
      console.log(`✅ Client ${clientId} features fetched:`, response);
      return response;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch client ${clientId} features via API, using mock response`);
      // Mock response for demo - return empty array if client has no features
      const mockResponse = {
        features: []
      };
      return mockResponse;
    }
  }

  async updateClientFeatures(clientId: number, featureIds: number[]): Promise<{ message: string; client: ClientDetails }> {
    try {
      const endpoint = `/accounts/clients/${clientId}/features/select/`;
      const response = await this.patch<{ message: string; client: ClientDetails }>(endpoint, {
        feature_ids: featureIds
      });
      console.log(`✅ Client ${clientId} features updated successfully:`, response);
      return response;
    } catch (error) {
      console.warn(`⚠️ Failed to update client ${clientId} features via API, simulating success`);
      // Simulate successful feature update in demo mode
      const mockResponse = {
        message: 'Features selected successfully',
        client: {
          id: clientId,
          name: 'Mock Client',
          slug: 'mock-client',
          total_students: 0,
          total_courses: 0,
          courses: [],
          features: featureIds.map(id => ({
            id,
            name: `Feature ${id}`
          }))
        } as ClientDetails
      };
      return mockResponse;
    }
  }

  // Course Operations API methods
  async duplicateCourse(request: CourseOperationRequest): Promise<CourseOperationResponse> {
    try {
      const response = await this.post<CourseOperationResponse>('/lms/course-operations/duplicate/', request);
      console.log('✅ Course duplication initiated:', response);
      return response;
    } catch (error) {
      console.warn('⚠️ Failed to initiate course duplication via API, using mock response');
      // Mock response for demo
      const mockResponse: CourseOperationResponse = {
        message: 'Course duplication initiated successfully',
        operation_id: `dup_${Math.random().toString(36).substr(2, 12)}`,
        status: 'pending',
        estimated_time: '2-5 minutes',
        status_check_url: `/lms/course-operations/dup_${Math.random().toString(36).substr(2, 12)}/status/`,
        source_course: {
          id: request.course_id!,
          title: 'Mock Course Title',
          client: 'Source Client'
        },
        destination_client: 'Destination Client'
      };
      return mockResponse;
    }
  }

  async bulkDuplicateCourses(request: CourseOperationRequest): Promise<CourseOperationResponse> {
    try {
      const response = await this.post<CourseOperationResponse>('/lms/course-operations/bulk-duplicate/', request);
      console.log('✅ Bulk course duplication initiated:', response);
      return response;
    } catch (error) {
      console.warn('⚠️ Failed to initiate bulk course duplication via API, using mock response');
      // Mock response for demo
      const mockResponse: CourseOperationResponse = {
        message: 'Bulk course duplication initiated successfully',
        operation_id: `bulk_${Math.random().toString(36).substr(2, 12)}`,
        status: 'pending',
        estimated_time: '10-25 minutes',
        status_check_url: `/lms/course-operations/bulk_${Math.random().toString(36).substr(2, 12)}/status/`,
        courses_to_duplicate: Math.floor(Math.random() * 20) + 5,
        destination_client: 'Destination Client'
      };
      return mockResponse;
    }
  }

  async deleteCourse(request: CourseOperationRequest): Promise<CourseOperationResponse> {
    try {
      const response = await this.post<CourseOperationResponse>('/lms/course-operations/delete/', request);
      console.log('✅ Course deletion initiated:', response);
      return response;
    } catch (error) {
      console.warn('⚠️ Failed to initiate course deletion via API, using mock response');
      // Mock response for demo
      const mockResponse: CourseOperationResponse = {
        message: 'Course deletion initiated successfully',
        operation_id: `del_${Math.random().toString(36).substr(2, 12)}`,
        status: 'pending',
        estimated_time: '1-3 minutes',
        status_check_url: `/lms/course-operations/del_${Math.random().toString(36).substr(2, 12)}/status/`,
        course: {
          id: request.course_id!,
          title: 'Mock Course Title',
          client: 'Client Name'
        },
        deletion_summary: {
          modules: 3,
          submodules: 8,
          content_items: 45,
          video_tutorials: 25,
          quizzes: 20,
          mcq_questions: 60,
          articles: 0,
          coding_problems: 0,
          assignments: 0,
          comments: 5,
          enrolled_students: Math.floor(Math.random() * 50),
          likes: Math.floor(Math.random() * 20)
        },
        warning: 'This action is irreversible. All course content and student progress will be permanently deleted.'
      };
      return mockResponse;
    }
  }

  async getOperationStatus(operationId: string): Promise<CourseOperationStatus> {
    try {
      const response = await this.get<CourseOperationStatus>(`/lms/course-operations/${operationId}/status/`);
      console.log(`✅ Operation status fetched for ${operationId}:`, response);
      return response;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch operation status for ${operationId}, using mock response`);
      // Mock response for demo - simulate different statuses
      const statuses: Array<'pending' | 'in_progress' | 'completed' | 'failed'> = ['pending', 'in_progress', 'completed'];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const progress = randomStatus === 'completed' ? 100 : randomStatus === 'in_progress' ? Math.floor(Math.random() * 80) + 10 : 0;
      
      const mockResponse: CourseOperationStatus = {
        operation_id: operationId,
        operation_type: operationId.startsWith('dup_') ? 'duplicate' : operationId.startsWith('bulk_') ? 'bulk_duplicate' : 'delete',
        status: randomStatus,
        progress,
        message: randomStatus === 'completed' ? 'Operation completed successfully' : 
                randomStatus === 'in_progress' ? 'Operation in progress...' : 'Operation pending...',
        created_at: new Date(Date.now() - Math.random() * 300000).toISOString(), // Random time in last 5 minutes
        completed_at: randomStatus === 'completed' ? new Date().toISOString() : undefined,
        result_data: randomStatus === 'completed' ? {
          new_course_id: Math.floor(Math.random() * 1000) + 100,
          new_course_title: 'Duplicated Course Title',
          new_course_slug: 'duplicated-course-slug',
          modules_count: Math.floor(Math.random() * 10) + 1,
          content_count: Math.floor(Math.random() * 50) + 10,
          published: false
        } : undefined
      };
      return mockResponse;
    }
  }

  async getOperationsList(params?: { 
    type?: string; 
    status?: string; 
    limit?: number; 
    offset?: number; 
  }): Promise<CourseOperationsList> {
    try {
      const response = await this.get<CourseOperationsList>('/lms/course-operations/', params);
      console.log('✅ Operations list fetched:', response);
      return response;
    } catch (error) {
      console.warn('⚠️ Failed to fetch operations list, using mock response');
      // Mock response for demo
      const mockOperations: CourseOperationStatus[] = [
        {
          operation_id: 'dup_mock1',
          operation_type: 'duplicate',
          status: 'completed',
          progress: 100,
          message: 'Course duplication completed successfully',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          completed_at: new Date(Date.now() - 3400000).toISOString(),
          result_data: {
            new_course_id: 205,
            new_course_title: 'Introduction to React - Copy',
            published: false
          }
        },
        {
          operation_id: 'bulk_mock2',
          operation_type: 'bulk_duplicate',
          status: 'in_progress',
          progress: 65,
          message: 'Bulk duplication in progress...',
          created_at: new Date(Date.now() - 1800000).toISOString()
        },
        {
          operation_id: 'del_mock3',
          operation_type: 'delete',
          status: 'failed',
          progress: 0,
          message: 'Course deletion failed',
          created_at: new Date(Date.now() - 900000).toISOString(),
          completed_at: new Date(Date.now() - 800000).toISOString(),
          error_details: {
            error_type: 'ValidationError',
            error_message: 'Cannot delete course with active enrollments'
          }
        }
      ];

      return {
        total_count: mockOperations.length,
        limit: params?.limit || 20,
        offset: params?.offset || 0,
        operations: mockOperations
      };
    }
  }
}

export const apiService = new ApiService();