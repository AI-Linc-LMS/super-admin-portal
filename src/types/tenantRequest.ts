export type TenantRequestStatus =
  | 'pending_review'
  | 'approved_setup'
  | 'rejected'
  | 'archived';

export interface TenantRequestListItem {
  id: number;
  reference_number: string;
  organisation_name: string;
  organisation_type: string;
  contact_name: string;
  contact_email: string;
  country: string;
  expected_learner_band: string;
  status: TenantRequestStatus;
  created_at: string;
  reviewed_at: string | null;
  approved_subdomain: string;
}

export interface TenantRequestDetail extends TenantRequestListItem {
  logo_url: string;
  description: string;
  rejection_reason: string;
  rejection_visible_to_requester: boolean;
  approved_client_id: number | null;
  google_subject_id: string;
  reviewed_by_email: string | null;
}

export interface SubdomainCheckResponse {
  available: boolean;
  reason?: string;
}

export interface ApproveRequestPayload {
  subdomain: string;
  send_credentials_email: boolean;
}

export interface RejectRequestPayload {
  reason: string;
  visible_to_requester: boolean;
}

export const ORG_TYPE_LABELS: Record<string, string> = {
  university: 'University',
  college: 'College',
  edtech: 'EdTech',
  corporate: 'Corporate L&D',
  institute: 'Training Institute',
};

export const LEARNER_BAND_LABELS: Record<string, string> = {
  lt_100: 'Fewer than 100',
  '100_500': '100 – 500',
  '500_2k': '500 – 2,000',
  '2k_10k': '2,000 – 10,000',
  gt_10k: 'More than 10,000',
};

export const STATUS_LABELS: Record<TenantRequestStatus, string> = {
  pending_review: 'Pending review',
  approved_setup: 'Approved · setup',
  rejected: 'Rejected',
  archived: 'Archived',
};

export const STATUS_TONE: Record<TenantRequestStatus, string> = {
  pending_review: 'bg-accent-100 text-accent-700',
  approved_setup: 'bg-secondary-100 text-secondary-700',
  rejected: 'bg-danger-100 text-danger-700',
  archived: 'bg-gray-100 text-gray-700',
};
