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

export interface WizardProgress {
  setup_completed: boolean;
  setup_step: number;
  total_steps: number;
  wizard_state: Record<string, unknown>;
  launched_at: string | null;
}

export type ProvisioningStatus =
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failed';

export interface ProvisioningLogEntry {
  step: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface ProvisioningSnapshot {
  status: ProvisioningStatus;
  log: ProvisioningLogEntry[];
  netlify_site_url: string;
  netlify_site_id: string;
  live_url: string;
}

export interface TenantRequestDetail extends TenantRequestListItem {
  logo_url: string;
  description: string;
  rejection_reason: string;
  rejection_visible_to_requester: boolean;
  approved_client_id: number | null;
  google_subject_id: string;
  reviewed_by_email: string | null;
  wizard_progress: WizardProgress | null;
  provisioning: ProvisioningSnapshot | null;
}

export const PROVISIONING_STEP_LABELS: Record<string, string> = {
  start: 'Provisioning started',
  netlify_create: 'Create Netlify site',
  netlify_env: 'Set environment variables',
  netlify_alias: 'Attach subdomain',
  netlify_build: 'Trigger build',
  dns: 'DNS routing',
  google_oauth: 'Google OAuth',
  done: 'Live',
  error: 'Failed',
};

export const WIZARD_STEP_TITLES = [
  'Welcome',
  'Brand identity',
  'URL',
  'Theme',
  'Features',
  'Admin capabilities',
  'Course library',
  'Review & launch',
] as const;

export interface SubdomainCheckResponse {
  available: boolean;
  reason?: string;
}

export interface ApproveRequestPayload {
  subdomain: string;
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
  pending_review: 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold',
  approved_setup: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  rejected: 'border-danger-500/30 bg-danger-500/10 text-danger-500',
  archived: 'border-themed-2 bg-line/[0.04] text-text-mute',
};
