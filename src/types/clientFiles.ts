export interface FileCategory {
  key: string;
  label: string;
  prefix: string;
  object_count: number;
  total_size_bytes: number;
  count_truncated: boolean;
}

export interface FileObject {
  key: string;
  size: number;
  last_modified: string | null;
  etag: string;
  content_type: string;
  url: string;
  module: string;
  category_key: string;
  original_filename: string;
  uploader_email: string | null;
  uploaded_file_id: number | null;
}

export interface FileListResponse {
  objects: FileObject[];
  next_token: string | null;
  is_truncated: boolean;
}

export interface DeleteFilesPayload {
  keys: string[];
}

export interface DeleteFilesResponse {
  deleted: string[];
  failed: Array<{ key: string; code: string; message: string }>;
  audited: number;
}

export interface FileDeletionAudit {
  id: number;
  s3_key: string;
  size_bytes: number;
  content_type: string;
  module: string;
  original_filename: string;
  deleted_at: string;
  deleted_by_email: string | null;
  ip_address: string | null;
}

export interface FileAuditListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: FileDeletionAudit[];
}
