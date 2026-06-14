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

  // Adaptive Courses (cross-tenant)
  ADAPTIVE_COURSES: '/superadmin/api/adaptive/courses/',
  ADAPTIVE_COURSE_DETAILS: (id: number) => `/superadmin/api/adaptive/courses/${id}/`,
  ADAPTIVE_COURSE_TENANTS: (id: number) => `/superadmin/api/adaptive/courses/${id}/tenants/`,
  ADAPTIVE_COURSE_MAP: (id: number) => `/superadmin/api/adaptive/courses/${id}/map/`,
  ADAPTIVE_COURSE_UNMAP: (id: number, mappingId: number) =>
    `/superadmin/api/adaptive/courses/${id}/map/${mappingId}/`,
  ADAPTIVE_JOBS: '/superadmin/api/adaptive/jobs/',
  ADAPTIVE_JOB_DETAILS: (jobId: string) => `/superadmin/api/adaptive/jobs/${jobId}/`,

  // Vimeo library (cross-tenant)
  VIMEO_VIDEOS: '/superadmin/api/vimeo/videos/',
  VIMEO_SYNC_STATUS: '/superadmin/api/vimeo/sync-status/',
  VIMEO_SYNC: '/superadmin/api/vimeo/sync/',
  VIMEO_FOLDERS: '/superadmin/api/vimeo/folders/',
  VIMEO_FOLDER_ADD_VIDEO: (projectId: string) => `/superadmin/api/vimeo/folders/${projectId}/videos/`,
  VIMEO_UPLOAD_CREATE: '/superadmin/api/vimeo/uploads/',
  VIMEO_UPLOAD_COMPLETE: '/superadmin/api/vimeo/uploads/complete/',
  VIMEO_MAP: '/superadmin/api/vimeo/map/',

  // Course Operations
  COURSE_OPERATIONS: {
    DUPLICATE: '/lms/course-operations/duplicate/',
    BULK_DUPLICATE: '/lms/course-operations/bulk-duplicate/',
    DELETE: '/lms/course-operations/delete/',
    STATUS: (operationId: string) => `/lms/course-operations/${operationId}/status/`,
    LIST: '/lms/course-operations/',
  },
} as const;

export const ROUTES = {
  LOGIN: '/login',
  DASHBOARD: '/',
  CLIENTS: '/clients',
  CLIENT_DETAILS: (id: string | number) => `/clients/${id}`,
  TENANT_REQUESTS: '/tenant-requests',
  COURSES: '/courses',
  ADAPTIVE_COURSES: '/adaptive-courses',
  ADAPTIVE_COURSE_DETAILS: (id: string | number) => `/adaptive-courses/${id}`,
  VIMEO_LIBRARY: '/vimeo-library',
  CHATBOTS: '/chatbots',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'ai_linc_auth_token',
  REFRESH_TOKEN: 'ai_linc_refresh_token',
  USER_DATA: 'ai_linc_user_data',
} as const;

export const DIFFICULTY_COLORS = {
  Easy: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  Medium: 'border border-brand-gold/30 bg-brand-gold/10 text-brand-gold',
  Hard: 'border border-danger-500/30 bg-danger-500/10 text-danger-500',
} as const;

export const STATUS_COLORS = {
  active: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  inactive: 'border border-themed-2 bg-line/[0.04] text-text-mute',
  published: 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  unpublished: 'border border-themed-2 bg-line/[0.04] text-text-mute',
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