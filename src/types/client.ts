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
  /** Whether this institution can take a payment, and whose Razorpay account it settles into.
   *  Payments fail closed: no connected account means the tenant cannot charge at all. */
  payment?: {
    connected: boolean;
    /** null when nothing is configured. */
    settles_to: 'institution' | 'platform' | null;
    key_id_masked: string;
  };

  /** The last day anyone on this tenant was seen, as an ISO date (YYYY-MM-DD). null means the
   *  backend has no signal at all, which is NOT the same as an empty tenant: the heartbeat behind
   *  it is written by one frontend stack only, so a tenant served by the Vercel apps or by
   *  zSkillup can be busy all week and still report nothing. Read the header tooltip on the
   *  Clients table before acting on it. */
  last_active_at?: string | null;
  /** Whole days between last_active_at and today, counted in Asia/Kolkata. null when never seen. */
  days_since_active?: number | null;
  /** The bucketed form the UI colours: <=7d live, 8-30d quiet, >30d dormant, no signal ever never.
   *  Bucketed by the backend on purpose, so this list and the dashboard's active-tenant tile can
   *  never classify the same institution two different ways. */
  activity_status?: 'live' | 'quiet' | 'dormant' | 'never';

  /** Absolute URL of the tenant's live LMS, e.g. "https://test.fde.academy". Always sent by the
   *  backend and never null, but it is NOT a promise that anything answers there: when
   *  site_url_source is "derived" the backend only guessed <slug>.ailinc.com because no domain was
   *  configured, and that guess is wrong for every tenant on its own domain (FDE Academy is served
   *  from test.fde.academy, and fde-academy.ailinc.com does not resolve at all). Optional here only
   *  so a cached bundle talking to a deploy that predates the field does not read undefined as a
   *  real address. Anything that renders it must first check site_url_source. */
  site_url?: string;
  /** Where site_url came from, and therefore how much it can be trusted. "custom_domain" and
   *  "netlify" are configured facts; "derived" is a guess assembled from the slug and must never be
   *  presented to an operator as a known-good address. */
  site_url_source?: 'custom_domain' | 'netlify' | 'derived';
  /** The domain an operator pinned for this tenant, bare host and no scheme, "" when unset. This is
   *  the writable field: correcting a wrong derived guess means setting this. Empty does NOT mean
   *  the tenant has no site, only that nobody pinned one, so site_url falls back to Netlify or to
   *  the slug guess. */
  custom_domain?: string;

  // Legacy fields for backward compatibility
  logo?: string;
  organization_name?: string;
  phone?: string;
  address?: string;
  status?: 'active' | 'inactive' | 'pending' | 'suspended';
  subscription_tier?: string;
  subscription_plan?: string;
  is_active?: boolean;
  /** When on, AI illustrations are generated for this client's adaptive articles. Default off. */
  generate_adaptive_article_images?: boolean;
  created_at?: string;
  updated_at?: string;
  /** Orphaned. No superadmin endpoint has ever populated this, so it is null for every tenant in
   *  production. Kept only because older call sites still read it. Anything that wants to know
   *  when a tenant was last touched must use last_active_at above. */
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

  // Tenant-wide course visibility. When true, students only see courses they're enrolled in.
  hide_available_courses_from_students?: boolean;
}

/**
 * A tenant that has actually been destroyed, read off the purge audit trail.
 * Mirrors superadmin_portal/serializers.py::PurgedClientSerializer field for field.
 *
 * This is deliberately NOT a `Client` and must never be widened into one. There is no Client row
 * behind it: the purge deletes the row rather than flagging it, so every number a Client carries
 * (students, courses, revenue, activity) has no value here, not even zero. Typing it separately is
 * what stops a purged row being handed to a component that would link to /clients/<id> and send an
 * operator to a 404 they would read as "the portal is broken" rather than "the tenant is gone".
 *
 * Note the absence of `id`. The backend omits it on purpose, and adding one here, even a derived
 * one, would let a purged row satisfy the places that key on Client['id'].
 *
 * Only `completed` and `partial` purges ever appear. The backend excludes `refused` (destroyed
 * nothing, tenant still live and serving traffic), `failed` (stopped mid-way, belongs in a retry
 * queue), `dry_run` (a preview) and `pending`/`running` (unfinished). So a row being in this list
 * is itself the claim that the database step ran.
 */
export interface PurgedClient {
  /** Primary key of the ClientPurge audit row, NOT of any client. */
  purge_id: number;
  /** The id the tenant used to have. A historical fact for cross-referencing old logs and tickets,
   *  never a live reference: nothing answers at /clients/<client_id> any more. */
  client_id: number;
  client_name: string;
  slug: string;
  /** `partial` means the database step ran but an external system was left dirty. It is destroyed
   *  AND unfinished, which is why it is not folded into `completed`. */
  status: 'completed' | 'partial';
  /** The backend's own wording for `status` (e.g. "Completed with errors"). Rendered rather than
   *  re-derived here, so the portal cannot describe a status differently from the audit trail. */
  status_label: string;
  /** Hard-coded false by the backend for every row. Kept because it states the thing the whole
   *  screen depends on, rather than leaving it implied by which tab you are looking at. */
  client_exists: boolean;
  /** True only for `completed`. False means leftovers survive somewhere, see degraded_steps. */
  fully_destroyed: boolean;
  /** Named steps that ran and did not finish, e.g. ["netlify"]. Non-empty means a live site, a
   *  bucket of a former customer's files or an OAuth grant is still out there and needs a human. */
  degraded_steps: string[];
  /** Display name of the operator who ordered it. null when that account was deleted afterwards
   *  (the FK is SET_NULL), which is a normal state for an old row and not a bug. */
  requested_by: string | null;
  created_at: string;
  /** When the purge finished. Nullable because rows written by older code paths may not have it,
   *  which is why the UI falls back to created_at rather than printing an empty cell. */
  completed_at: string | null;
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