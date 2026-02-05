export interface Client {
  id: number;
  name: string;
  slug: string;
  logo_url?: string | null;
  email?: string | null;
  phone_number?: string | null;
  joining_date?: string; // Make optional for backward compatibility
  poc_name?: string | null;
  total_students: number;
  total_courses: number;
  total_admins?: number;
  total_superadmins?: number;
  total_course_managers?: number;

  // Legacy fields for backward compatibility
  logo?: string;
  organization_name?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  subscription_tier?: string;
  subscription_plan?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  last_login?: string;
  student_count?: number;
  students_count?: number; // Alternative naming for backward compatibility
  instructor_count?: number;
  course_count?: number;
  courses_count?: number; // Alternative naming for backward compatibility
  active_enrollments?: number;
  total_revenue?: number;
  monthly_revenue?: number;
  contact_person?: string;
  industry?: string;
  expiry_date?: string;

  api_url?: string;
  google_client_id?: string;
  payment_encryption_key?: string;
}

export interface Feature {
  id: number;
  name: string;
}

export interface ClientDetails extends Client {
  courses: ClientCourse[];
  students?: Student[];
  course_managers?: CourseManager[];
  admins?: Admin[];
  superadmins?: SuperAdmin[];
  description?: string;
  website?: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  statistics?: ClientStatistics;
  features?: Feature[];
}

export interface Instructor {
  id: number;
  name: string;
  bio?: string;
}

export interface ClientCourse {
  id: number;
  title: string;
  subtitle?: string | null;
  slug: string;
  description: string;
  difficulty_level: 'Easy' | 'Medium' | 'Hard';
  duration_in_hours: number;
  price: string;
  is_free: boolean;
  certificate_available: boolean;
  thumbnail?: string | null;
  published: boolean;
  enrollment_enabled?: boolean;
  content_lock_enabled?: boolean;
  enrolled_students_count: number;
  instructors: Instructor[];
  course_manager?: number | null; // Course manager ID
  course_manager_info?: {
    id: number;
    user_id: number;
    name: string;
    email: string;
    username?: string;
  } | null; // Full course manager object
  modules_count?: number;
  created_at: string;
  updated_at: string;
  // Deprecated fields for backward compatibility
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  is_published?: boolean;
  enrollment_count?: number;
  completion_rate?: number;
  duration?: number;
  category?: string;
}

export interface ClientStatistics {
  total_students: number;
  total_instructors: number;
  total_courses: number;
  active_enrollments: number;
  completed_courses: number;
  revenue_this_month: number;
  growth_rate: number;
  enrollment_trend: EnrollmentTrend[];
  course_popularity: CoursePopularity[];
}

export interface EnrollmentTrend {
  date: string;
  enrollments: number;
  completions: number;
}

export interface CoursePopularity {
  course_name: string;
  enrollments: number;
  completion_rate: number;
}

export interface ClientFilters {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  subscription_plan?: string;
  sort_by?: 'name' | 'created_at' | 'student_count';
  sort_order?: 'asc' | 'desc';
}

export interface Student {
  id: number;
  user_id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  profile_pic_url?: string | null;
  role: string;
  is_active: boolean;
  phone_number?: string | null;
  bio?: string | null;
  social_links?: Record<string, any>;
  date_of_birth?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Admin {
  id: number;
  user_id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  profile_pic_url?: string | null;
  role: string;
  is_active: boolean;
  phone_number?: string | null;
  bio?: string | null;
  social_links?: Record<string, any>;
  date_of_birth?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ManagedCourse {
  id: number;
  title: string;
  slug: string;
}

export interface CourseManager extends Admin {
  managed_courses_count?: number;
  managed_courses?: ManagedCourse[];
}

export interface SuperAdmin {
  id: number;
  user_id: number;
  name: string;
  first_name: string;
  last_name: string;
  email: string;
  username: string;
  profile_pic_url?: string | null;
  role: string;
  is_active: boolean;
  phone_number?: string | null;
  bio?: string | null;
  social_links?: Record<string, any>;
  date_of_birth?: string | null;
  created_at: string;
  updated_at: string;
}

// Course Operations Types
export interface CourseOperationRequest {
  // Single course duplication
  course_id?: number;
  from_client_id?: number;
  to_client_id?: number;
  
  // Bulk course duplication
  course_filter?: 'all' | 'free_only' | 'paid_only' | 'published_only' | 'free_published';
  
  // Course deletion
  client_id?: number;
  confirm_deletion?: boolean;
}

export interface CourseOperationResponse {
  message: string;
  operation_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  estimated_time: string;
  status_check_url: string;
  
  // For duplication operations
  source_course?: {
    id: number;
    title: string;
    client: string;
  };
  destination_client?: string;
  courses_to_duplicate?: number;
  
  // For deletion operations
  course?: {
    id: number;
    title: string;
    client: string;
  };
  deletion_summary?: {
    modules: number;
    submodules: number;
    content_items: number;
    video_tutorials: number;
    quizzes: number;
    mcq_questions: number;
    articles: number;
    coding_problems: number;
    assignments: number;
    comments: number;
    enrolled_students: number;
    likes: number;
  };
  warning?: string;
}

export interface CourseOperationStatus {
  operation_id: string;
  operation_type: 'duplicate' | 'bulk_duplicate' | 'delete';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number;
  message: string;
  created_at: string;
  completed_at?: string;
  result_data?: {
    new_course_id?: number;
    new_course_title?: string;
    new_course_slug?: string;
    modules_count?: number;
    submodules_count?: number;
    content_count?: number;
    published?: boolean;
  };
  error_details?: {
    error_type: string;
    error_message: string;
  };
}

export interface CourseOperationsList {
  total_count: number;
  limit: number;
  offset: number;
  operations: CourseOperationStatus[];
}