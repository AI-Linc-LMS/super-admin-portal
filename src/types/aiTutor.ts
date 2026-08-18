/**
 * AI Tutor per-tenant configuration, as served by
 * `/superadmin/api/ai-tutor/clients/<id>/config/`.
 *
 * The cost figures are measured on production traffic and come FROM the backend rather than
 * being written here. That is deliberate: a per-minute rate typed into the frontend goes
 * stale the moment a vendor changes a price or the platform re-measures, and nothing would
 * catch it.
 */

export interface TutorModelOption {
  id: string;
  label: string;
  blurb: string;
  recommended: boolean;
  /** Measured USD per metered minute on this platform's own traffic. */
  usd_per_minute: string | null;
  usd_per_15_min_session: string | null;
  /** Where this sits against the most expensive option, as a percentage. */
  percent_of_baseline?: number;
}

export interface ClientTutorConfig {
  client: number;
  client_name: string;
  is_enabled: boolean;
  /** Empty string means "follow the platform default". */
  realtime_model: string;
  /** The override resolved against the platform default. Read-only. */
  effective_model: string;
  effective_model_detail: TutorModelOption | null;
  /** What this tenant's SAVED configuration is expected to cost per metered minute. */
  estimated_usd_per_minute: string | null;
  voice: string;
  monthly_minutes_per_student: number;
  max_session_minutes: number;
  daily_cost_ceiling_usd: string;
  coding_enabled: boolean;
  /** Ask the tutor for shorter turns. Audio out is ~83% of the bill. */
  concise_mode: boolean;
  /** How quickly the tutor takes its turn: low | medium | high. */
  turn_detection_eagerness: string;
  /** gpt-4o-mini-transcribe instead of whisper-1 for the transcript. */
  cheap_transcription: boolean;
  updated_at: string | null;
}

/**
 * Everything needed to price a configuration LIVE, before it is saved.
 *
 * Supplied by the backend rather than hardcoded here, so the operator can never be shown a
 * cost the backend disagrees with.
 */
export interface TutorCostModel {
  /** Fraction of the total bill each lever is estimated to remove, keyed by lever. */
  lever_savings: Record<string, string>;
  session_minutes: number;
  monthly_minutes_per_student: number;
  students: number;
}

export interface ClientTutorConfigResponse {
  /** False when this tenant has never been configured, which is how the tutor stays off. */
  exists: boolean;
  config: ClientTutorConfig;
  models: TutorModelOption[];
  platform_default: string;
  measurement_basis: string;
  cost_model: TutorCostModel;
  created?: boolean;
}

export type ClientTutorConfigUpdate = Partial<
  Pick<
    ClientTutorConfig,
    | 'is_enabled'
    | 'realtime_model'
    | 'voice'
    | 'monthly_minutes_per_student'
    | 'max_session_minutes'
    | 'daily_cost_ceiling_usd'
    | 'coding_enabled'
    | 'concise_mode'
    | 'turn_detection_eagerness'
    | 'cheap_transcription'
  >
>;
