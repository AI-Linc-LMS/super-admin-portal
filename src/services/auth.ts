import { apiService } from './api';
import { LoginCredentials, AuthResponse, User } from '../types/auth';
import { API_ENDPOINTS, STORAGE_KEYS } from '../utils/constants';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiService.post<AuthResponse>(API_ENDPOINTS.LOGIN, credentials);
      
      console.log('🔍 Login API response:', response);
      
      // Store tokens and user data using the correct field names
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.access_token);
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, response.refresh_token);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(response.user));
      
      console.log('✅ Stored auth data:', {
        hasToken: !!response.access_token,
        hasRefreshToken: !!response.refresh_token,
        hasUser: !!response.user
      });
      
      return response;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw new Error('Invalid credentials');
    }
  }

  async logout(): Promise<void> {
    // Clear local storage
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    
    // Don't automatically redirect here - let the auth store handle it
    console.log('🔓 Auth service logout completed - localStorage cleared');
  }

  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await apiService.post<{ access: string }>(API_ENDPOINTS.REFRESH_TOKEN, {
        refresh: refreshToken,
      });

      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.access);
      return response.access;
    } catch (error) {
      await this.logout();
      throw new Error('Failed to refresh token');
    }
  }

  getStoredUser(): User | null {
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return userData ? JSON.parse(userData) : null;
    } catch {
      return null;
    }
  }

  getStoredToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  getStoredRefreshToken(): string | null {
    return localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  isAuthenticated(): boolean {
    const token = this.getStoredToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  hasRole(role: string): boolean {
    const user = this.getStoredUser();
    return user?.role === role;
  }
}

export const authService = new AuthService();