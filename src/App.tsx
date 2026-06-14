import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import Layout from './components/layout/Layout';
import Preloader from './components/Preloader';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetails from './pages/ClientDetails';
import TenantRequests from './pages/TenantRequests';
import Courses from './pages/Courses';
import AdaptiveCourses from './pages/AdaptiveCourses';
import AdaptiveCourseDetails from './pages/AdaptiveCourseDetails';
import VimeoLibrary from './pages/VimeoLibrary';
import Chatbots from './pages/Chatbots';
import Settings from './pages/Settings';
import { useAuthStore } from './store/authStore';
import { ROUTES } from './utils/constants';
import './i18n'; // Initialize i18n

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false, // Don't retry failed queries
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      refetchOnMount: false, // Don't refetch on component mount if we have cached data
      refetchInterval: false, // Disable automatic refetching
    },
  },
});

// Protected Route component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  console.log('🔐 ProtectedRoute check:', { isAuthenticated, isLoading });

  if (isLoading) {
    return <Preloader label="AI Linc · Authenticating" />;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />;
};

// Public Route component to prevent authenticated users from seeing login
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  console.log('🌐 PublicRoute check:', { isAuthenticated, isLoading });

  if (isLoading) {
    return <Preloader label="AI Linc · Loading" />;
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.DASHBOARD} replace />;
};

function App() {
  console.log('🚀 App component rendered');
  
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path={ROUTES.LOGIN} element={<PublicRoute><Login /></PublicRoute>} />
            
            {/* Protected Routes - Fixed nested routing */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Child routes that will render in Layout's <Outlet /> */}
              <Route index element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="clients/:id" element={<ClientDetails />} />
              <Route path="tenant-requests" element={<TenantRequests />} />
              <Route path="courses" element={<Courses />} />
              <Route path="adaptive-courses" element={<AdaptiveCourses />} />
              <Route path="adaptive-courses/:id" element={<AdaptiveCourseDetails />} />
              <Route path="vimeo-library" element={<VimeoLibrary />} />
              <Route path="chatbots" element={<Chatbots />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                color: '#1f2937',
              },
              success: {
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#ffffff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#ffffff',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;