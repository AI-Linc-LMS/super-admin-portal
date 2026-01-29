export interface DashboardStats {
  total_students: number;
  total_clients: number;
  total_courses: number;
  total_active_clients: number;
  total_course_managers?: number;
  total_admins?: number;
}

export interface Course {
  id: number;
  title: string;
  subtitle: string | null;
  slug: string;
  description: string;
  difficulty_level: 'Easy' | 'Medium' | 'Hard';
  duration_in_hours: number;
  price: string;
  is_free: boolean;
  certificate_available: boolean;
  thumbnail: string | null;
  published: boolean;
  enrolled_students_count: number;
  instructors: Instructor[];
  modules_count: number;
  created_at: string;
  updated_at: string;
}

export interface Instructor {
  id: number;
  name: string;
  bio: string;
}

export interface CoursesResponse {
  client: {
    id: number;
    name: string;
    slug: string;
  };
  total_courses: number;
  courses: Course[];
}