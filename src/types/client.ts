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
}

export interface ClientDetails extends Client {
  courses: ClientCourse[];
  description?: string;
  website?: string;
  contact_person?: string;
  phone?: string;
  address?: string;
  statistics?: ClientStatistics;
}

export interface Instructor {
  id: number;
  name: string;
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
  enrolled_students_count: number;
  instructors: Instructor[];
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