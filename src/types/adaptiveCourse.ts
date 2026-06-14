// Types for the cross-tenant super-admin adaptive-course surface.
// Mirrors the payloads from superadmin_portal/adaptive_serializers.py.

export interface TenantBrief {
  id: number;
  name: string;
  slug: string;
}

export interface AdaptiveCourseSummary {
  id: number;
  title: string;
  slug: string;
  description: string;
  target_audience: string;
  duration_weeks: number;
  difficulty_levels: string[];
  is_published: boolean;
  module_count: number;
  submodule_count: number;
  quiz_count: number;
  article_count: number;
  coding_count: number;
  video_count: number;
  header_image_url: string | null;
  card_image_url: string | null;
  header_image_hidden: boolean;
  card_image_hidden: boolean;
  created_at: string;
  updated_at: string;
  // Super-admin extras
  client: TenantBrief | null;
  is_template: boolean;
  cloned_from_id: number | null;
  gen_total_tokens: number;
  gen_cost_usd: string; // DRF DecimalField serializes as string
  mapping_count: number;
}

export interface AdaptiveSubModule {
  id: number;
  order: number;
  title: string;
  description: string;
  articles?: any[];
  quizzes?: any[];
  coding_sets?: any[];
  video_companions?: any[];
}

export interface AdaptiveModule {
  id: number;
  weekno: number;
  title: string;
  submodules: AdaptiveSubModule[];
}

export interface AdaptiveCourseDetail extends AdaptiveCourseSummary {
  modules: AdaptiveModule[];
  skills: any[];
}

export type MappingMode = 'clone' | 'shared';

export interface TenantMapping {
  id: number;
  mode: MappingMode;
  client: TenantBrief | null;
  cloned_course_id: number | null;
  is_published: boolean;
  effective_is_published: boolean;
  enrollment_count: number;
  created_at: string;
  updated_at: string;
}

export interface CourseTenantsResponse {
  course_id: number;
  is_template: boolean;
  mappings: TenantMapping[];
}

export interface AdaptiveJobSummary {
  id: number;
  job_id: string;
  title: string;
  status:
    | 'pending'
    | 'generating_outline'
    | 'creating_structure'
    | 'generating_content'
    | 'completed'
    | 'failed';
  scope: 'full_course' | 'module' | 'submodule';
  total_content_items: number;
  completed_content_items: number;
  progress_percentage: number;
  generated_course_id: number | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  client: TenantBrief | null;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost_usd: string;
  model_usage: Record<
    string,
    { prompt_tokens: number; completion_tokens: number; total_tokens: number; calls: number }
  >;
}

export interface AdaptiveJobDetail extends AdaptiveJobSummary {
  input_data: Record<string, any>;
  config: Record<string, any>;
  outline_data: any;
  error_log: any[];
  tree: any;
  log: any[];
  stats: Record<string, any>;
  skills: any[];
}
