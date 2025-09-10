import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuthState, LoginCredentials } from '../types/auth';
import { authService } from '../services/auth';
import toast from 'react-hot-toast';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: true, // Start with loading true

      // Initialize auth state after store hydration
      initializeAuth: () => {
        console.log('🔄 Initializing authentication state...');
        try {
          const user = authService.getStoredUser();
          const token = authService.getStoredToken();
          const refreshToken = authService.getStoredRefreshToken();
          const isAuthenticated = authService.isAuthenticated();
          
          console.log('🔍 Auth initialization data:', {
            hasUser: !!user,
            hasToken: !!token,
            hasRefreshToken: !!refreshToken,
            isAuthenticated
          });

          set({
            user,
            token,
            refreshToken,
            isAuthenticated,
            isLoading: false,
          });
        } catch (error) {
          console.error('❌ Auth initialization error:', error);
          set({
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true });
        try {
          const response = await authService.login(credentials);
          console.log('✅ Login successful, setting auth state...');
          
          set({
            user: response.user,
            token: response.access_token, // Use access_token from response
            refreshToken: response.refresh_token, // Use refresh_token from response
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Small delay to ensure state is set before any redirects
          await new Promise(resolve => setTimeout(resolve, 100));
          
          console.log('✅ Auth state updated successfully');
          toast.success('Login successful!');
        } catch (error) {
          console.error('❌ Login failed:', error);
          set({ isLoading: false });
          toast.error('Invalid email or password');
          throw error;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        // Clear local storage first
        localStorage.removeItem('ai_linc_auth_token');
        localStorage.removeItem('ai_linc_refresh_token');
        localStorage.removeItem('ai_linc_user_data');
        
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
        toast.success('Logged out successfully');
      },

      refreshAuth: async () => {
        try {
          const newToken = await authService.refreshToken();
          set({ token: newToken });
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'auth-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Initialize auth state after hydration
        state?.initializeAuth?.();
      },
    }
  )
);