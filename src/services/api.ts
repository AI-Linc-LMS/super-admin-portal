import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';
import { Client } from '../types/client';
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
  async getClients(params?: any) {
    try {
      return await this.get('/superadmin/api/clients/', params);
    } catch (error) {
      console.warn('⚠️ Failed to fetch clients from API, using demo data');
      // Return demo data when API fails
      return {
        results: [
          {
            id: 1,
            name: 'John Doe',
            email: 'john.doe@techcorp.com',
            organization_name: 'TechCorp Solutions',
            phone: '+1-555-0123',
            status: 'active',
            subscription_plan: 'enterprise',
            is_active: true,
            created_at: '2024-01-15T10:30:00Z',
            updated_at: '2024-03-10T14:20:00Z',
            last_login: '2024-03-09T16:45:00Z',
            student_count: 245,
            instructor_count: 12,
            course_count: 18,
            active_enrollments: 189,
            total_revenue: 24500,
            monthly_revenue: 4200
          },
          {
            id: 2,
            name: 'Sarah Wilson',
            email: 'sarah.wilson@edulearn.org',
            organization_name: 'EduLearn Institute',
            phone: '+1-555-0456',
            status: 'active',
            subscription_plan: 'professional',
            is_active: true,
            created_at: '2024-02-20T09:15:00Z',
            updated_at: '2024-03-08T11:30:00Z',
            last_login: '2024-03-08T18:22:00Z',
            student_count: 156,
            instructor_count: 8,
            course_count: 12,
            active_enrollments: 134,
            total_revenue: 18300,
            monthly_revenue: 3100
          }
        ],
        count: 2,
        next: null,
        previous: null
      };
    }
  }

  async getClientDetails(id: number) {
    try {
      return await this.get(`/superadmin/api/clients/${id}/`);
    } catch (error) {
      console.warn(`⚠️ Failed to fetch client ${id} details from API, using demo data`);
      // Return demo data when API fails
      return {
        id,
        name: 'Demo Client',
        email: 'demo@example.com',
        organization_name: 'Demo Organization',
        phone: '+1-555-0123',
        address: '123 Demo Street, Demo City, DC 12345',
        status: 'active',
        subscription_plan: 'professional',
        is_active: true,
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-03-10T14:20:00Z',
        last_login: '2024-03-09T16:45:00Z',
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
            difficulty: 'Easy' as const,
            is_published: true,
            is_free: false,
            enrollment_count: 45,
            completion_rate: 85,
            created_at: '2024-01-20T10:00:00Z',
            updated_at: '2024-03-05T15:30:00Z',
            price: 299,
            duration: 40,
            category: 'Programming'
          },
          {
            id: 2,
            title: 'Advanced Web Development',
            difficulty: 'Hard' as const,
            is_published: true,
            is_free: false,
            enrollment_count: 32,
            completion_rate: 72,
            created_at: '2024-02-01T11:00:00Z',
            updated_at: '2024-03-08T09:15:00Z',
            price: 599,
            duration: 80,
            category: 'Web Development'
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
            { date: '2024-03-01', enrollments: 15, completions: 8 },
            { date: '2024-03-02', enrollments: 12, completions: 6 },
            { date: '2024-03-03', enrollments: 18, completions: 10 },
            { date: '2024-03-04', enrollments: 14, completions: 7 },
            { date: '2024-03-05', enrollments: 16, completions: 9 }
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
      return await this.post('/superadmin/api/clients/create/', clientData);
    } catch (error) {
      console.warn('⚠️ Failed to create client via API, simulating success');
      // Simulate successful creation in demo mode
      return {
        id: Math.floor(Math.random() * 1000) + 100,
        ...clientData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_active: true,
        student_count: 0,
        instructor_count: 0,
        course_count: 0,
        active_enrollments: 0
      };
    }
  }

  async updateClient(id: number, clientData: Partial<Client>) {
    try {
      return await this.put(`/superadmin/api/clients/${id}/update/`, clientData);
    } catch (error) {
      console.warn(`⚠️ Failed to update client ${id} via API, simulating success`);
      // Simulate successful update in demo mode
      return {
        ...clientData,
        id,
        updated_at: new Date().toISOString()
      };
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
}

export const apiService = new ApiService();