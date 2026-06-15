// Types for the super-admin Vimeo management surface.
// Mirrors superadmin_portal/vimeo_serializers.py + vimeo_views.py payloads.

export interface VideoCompanionMapping {
  config_id: number;
  is_active: boolean;
  submodule_id: number | null;
  submodule_title: string;
  course_id: number | null;
  course_title: string;
  client: { id: number; name: string } | null;
}

export interface VimeoVideoItem {
  id: number;
  vimeo_id: string;
  title: string;
  description: string;
  duration_seconds: number;
  thumbnail_url: string;
  tags: string[];
  has_text_track: boolean;
  embed_url: string;
  synced_at: string;
  mappings: VideoCompanionMapping[];
  is_mapped: boolean;
}

export interface VimeoVideoListResponse {
  count: number;
  limit: number;
  offset: number;
  results: VimeoVideoItem[];
}

export interface VimeoSyncStatus {
  synced_count: number;
  total_on_vimeo: number | null;
  with_transcript: number;
  mapped_count: number;
  last_synced_at: string | null;
  error: string | null;
}

export interface VimeoFolder {
  id: string;
  uri: string;
  name: string;
  video_count: number;
  created_time: string | null;
}

export interface VimeoUploadTicket {
  uri: string;
  vimeo_id: string;
  upload_link: string;
}

export interface VimeoFolderVideosResponse {
  project_id: string;
  count: number;
  results: VimeoVideoItem[];
}

export interface VimeoMapResultItem {
  vimeo_id: string;
  submodule_id?: number | null;
  ok: boolean;
  error?: string;
  config_id?: number;
  is_active?: boolean;
  pending_transcript?: boolean;
}

export interface VimeoModuleMapResponse {
  module_id: number;
  results: VimeoMapResultItem[];
}
