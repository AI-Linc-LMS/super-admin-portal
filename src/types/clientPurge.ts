/**
 * Wire shapes for the full-institution purge, mirrored from
 * superadmin_portal/purge/plan.py::build_manifest and superadmin_portal/views.py.
 *
 * Written down field by field rather than typed as `any` because the modal that reads it is the
 * last screen an operator sees before a tenant stops existing. A silently mistyped field there
 * renders "undefined" or nothing at all, and a blank impact panel reads as "there is nothing to
 * lose" when it actually means "the UI could not find the number".
 */

/** A reason the purge must not run. Never a warning: every one of these describes damage landing
 *  on a tenant that is NOT being deleted, which is why the backend offers no override flag. */
export interface PurgeBlocker {
  code: string;
  message: string;
  count: number;
  detail: Record<string, any>;
}

export interface PurgeS3Prefix {
  prefix: string;
  bucket?: string;
  /** null when the prefix could not be sized. It is still deleted: being unable to count is not a
   *  reason to leave a customer's uploads in the bucket. */
  object_count: number | null;
  total_size_bytes: number | null;
  count_truncated?: boolean;
  error?: string;
}

export interface PurgeNetlify {
  recorded_site_id: string;
  recorded_site_url: string;
  /** Resolved by id first and by site name second, because sites provisioned before
   *  netlify_site_id existed have a blank column and a very real live site. */
  resolved_site_id: string;
  resolved_site_url: string;
  resolved_from: string;
  custom_domain: string;
  error: string;
}

export interface PurgeIntegrations {
  zoom: {
    present: boolean;
    connection_mode: string;
    /** Only OAuth grants have something to hand back. Server-to-server credentials belong to the
     *  customer's own Zoom app and die with the row. */
    needs_revoke: boolean;
    connected_email: string;
  };
  google: { present: boolean; needs_revoke: boolean; connected_email: string };
  razorpay: { present: boolean; key_id: string };
  api_credentials: number;
  tenant_integration: { present: boolean; enabled: boolean; callback_url: string };
}

export interface PurgeCounts {
  by_model?: Record<string, number>;
  zero_row_models?: string[];
  total_rows?: number;
  models_in_closure?: number;
  /** A model the planner could not count is recorded here rather than dropped. A manifest that
   *  silently omits a model is a manifest that understates what is about to be destroyed. */
  count_errors?: Record<string, string>;
  /** The shallow plan skips the ~150 count queries and sends this instead. */
  skipped?: boolean;
}

export interface PurgeProtectBlocker {
  source: string;
  field: string;
  target: string;
  handler: string;
  count: number;
  blocks_delete: boolean;
}

export interface PurgeCollectorProbe {
  raised?: string | null;
  protecting_models?: string[];
  message?: string;
  fast_deletes?: number;
  collected_models?: number;
  skipped?: boolean;
}

export interface PurgeManifest {
  client: {
    id: number;
    name: string;
    slug: string;
    is_active: boolean;
    joining_date: string | null;
    netlify_site_id: string;
    netlify_site_url: string;
    custom_domain: string;
  };
  counts: PurgeCounts;
  protect_blockers: PurgeProtectBlocker[];
  external: {
    s3_prefixes: PurgeS3Prefix[];
    netlify: PurgeNetlify;
    integrations: PurgeIntegrations;
    redis_keys: string[];
  };
  blocking: PurgeBlocker[];
  collector_probe: PurgeCollectorProbe;
  /** false when the shallow plan answered. The hash is identical either way, so a shallow preview
   *  still produces a confirmation the execute endpoint accepts. */
  deep: boolean;
  generated_at: string;
  manifest_version: number;
  /** What the operator is confirming. Covers the tenant, its slug, its blockers, its external
   *  resources and the model graph, but deliberately not the row counts, which move every time a
   *  learner answers a question. */
  manifest_hash: string;
}

export type PurgeStatus =
  | 'pending'
  | 'dry_run'
  | 'running'
  | 'completed'
  | 'failed'
  | 'refused';

export interface PurgeQueuedResponse {
  message: string;
  purge_id: number;
  client_id: number;
  status: PurgeStatus;
  manifest_hash: string;
  status_url: string;
}

/** One line of the append-only resume ledger. `step` is one of the eight ordered steps, or one of
 *  the bookkeeping entries the task writes outside that order (`orphan_candidates`, `dry_run`,
 *  `refused`, `resolve_client`, `error`). */
export interface PurgeStepEntry {
  step: string;
  status: string;
  detail: Record<string, any>;
  at: string;
}

export interface PurgeStatusResponse {
  purge_id: number;
  /** A historical fact, not a live reference. The audit row outlives the client it describes. */
  client_id: number;
  client_name: string;
  slug: string;
  status: PurgeStatus;
  step_log: PurgeStepEntry[];
  manifest_hash: string;
  requested_by: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface PurgeConfirmation {
  /** The client name, typed out. Exact match, whitespace trimmed and nothing else: the backend
   *  will not accept "acme" for "ACME Corp", which is the confusion this field exists to catch. */
  confirm_name: string;
  manifest_hash: string;
}
