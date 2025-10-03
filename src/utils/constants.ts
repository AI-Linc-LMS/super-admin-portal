export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://be-app.ailinc.com';
export const DEBUG_MODE = false; // Set to false in production
export const BYPASS_AUTH_FOR_DEBUG = true; // Set to false in production

export const API_ENDPOINTS = {
  // Authentication
  LOGIN: '/accounts/clients/1/user/login/',
  REFRESH_TOKEN: '/accounts/token/refresh/',
  
  // Dashboard
  DASHBOARD: '/superadmin/api/dashboard/',
  
  // Clients
  CLIENTS: '/superadmin/api/clients/',
  CLIENT_DETAILS: (id: number) => `/superadmin/api/clients/${id}/`,
  
  // AI-Linc Courses
  AI_LINC_COURSES: '/superadmin/api/ai-linc/courses/',
} as const;

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  CLIENTS: '/clients',
  CLIENT_DETAILS: (id: string | number) => `/clients/${id}`,
  COURSES: '/courses',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'ai_linc_auth_token',
  REFRESH_TOKEN: 'ai_linc_refresh_token',
  USER_DATA: 'ai_linc_user_data',
} as const;

export const DIFFICULTY_COLORS = {
  Easy: 'bg-secondary-100 text-secondary-700',
  Medium: 'bg-accent-100 text-accent-700',
  Hard: 'bg-danger-100 text-danger-700',
} as const;

export const STATUS_COLORS = {
  active: 'bg-secondary-100 text-secondary-700',
  inactive: 'bg-gray-100 text-gray-700',
  published: 'bg-secondary-100 text-secondary-700',
  unpublished: 'bg-gray-100 text-gray-700',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
} as const;

export const CHART_COLORS = {
  primary: '#3b82f6',
  secondary: '#22c55e',
  accent: '#f59e0b',
  danger: '#ef4444',
  info: '#06b6d4',
  purple: '#8b5cf6',
} as const;