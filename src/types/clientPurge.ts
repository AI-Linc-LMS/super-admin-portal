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
  /** Present when one `code` can appear several times in one manifest, which is only
   *  `cross_tenant_cascade`: it emits one entry per boundary EDGE, all sharing that code, and the
   *  backend keys the hashed payload on this instead (plan.py::cross_tenant_cascade_blockers). The
   *  UI has the same problem the hash does, so anything per-blocker (a React key, a repair target)
   *  must use this and fall back to `code` only for the single-instance blockers that omit it. */
  key?: string;
  message: string;
  count: number;
  /** True means "at least `count`", never "exactly `count`". `cross_tenant_cascade` counts through
   *  a LIMITed subquery capped at `detail.count_cap`, so the cap must never be rendered as a fact:
   *  show "1000 or more", not "1000". Absent on the blockers that count exactly. */
  count_capped?: boolean;
  detail: Record<string, any>;
}

/** `detail` of a `cross_tenant_cascade` blocker, the only blocker kind that can carry a fix.
 *  Narrowed from the generic Record so the repair UI can name the edge it is about to touch. */
export interface CrossTenantBlockerDetail {
  /** Django model label of the row that is mis-linked, e.g. "activity.UserActivity". */
  child: string;
  /** The FK on that model which crosses the tenant boundary, e.g. "userprofile". */
  field: string;
  /** Django model label the FK points at. The repair only understands "accounts.UserProfile". */
  parent: string;
  handler: string;
  count_cap: number;
  /** THE gate for offering a repair, and it is the backend's answer rather than the UI's guess.
   *  True only when the crossing is a UserProfile mis-link, which is the single shape
   *  repair.py::repairable_edges knows how to re-home. A crossing on a shared MCQ or a template
   *  course is an equally real blocker with a completely different fix, and the repair endpoint
   *  would correctly report nothing to do for it, which to an operator reads as a broken tool. */
  repairable: boolean;
  /** Up to 20, stringified backend-side because several of these models are UUID-keyed. A sample,
   *  never the full set: compare its length against `count` before calling it "the rows". */
  sample_ids: string[];
}

/* --- Cross-tenant repair ---------------------------------------------------------------------
 *
 * Mirrored from superadmin_portal/purge/repair.py::apply. One endpoint, two meanings, switched by
 * `execute`: false plans and writes nothing, true performs exactly the rows the plan marked
 * `rehome`. The response is the SAME document either way, which is what makes the two-step
 * trustworthy: the plan the operator read and the receipt they get back are the same shape, so
 * "what happened" can be compared against "what was promised" field for field.
 *
 * The repair only ever repoints the profile FK to the same PERSON's profile inside the row's own
 * client. It never touches the row's `client`, never deletes, and never invents a profile.
 */

/** Why a row cannot be re-homed. A string and not a boolean because the operator's next move is
 *  different for each one, and the modal prints that difference. */
export type RepairRefusalReason =
  | 'no_profile_in_row_client'
  | 'ambiguous_profile_in_row_client'
  | 'unique_collision'
  | 'unique_collision_within_batch'
  /** A profile in the row's own tenant holds the same email address, and that is NOT proof the two
   *  User rows are one person: nothing on this platform verifies an address, and the rows this
   *  fires on are exactly the ones where nobody else in that tenant holds it, so a squatter who
   *  registered the victim's address is the sole candidate and the ambiguity check never sees them.
   *  The portal never acts on this match; it shows it, with the target, so an operator can review
   *  it and run the management command if it is genuine. */
  | 'email_identity_not_trusted'
  /** Same match, opted into from a shell, and still refused: the account was created AFTER the row
   *  it would inherit, so it cannot be the person who produced it. */
  | 'target_user_joined_after_row';

/** How the target profile was proven. `same_email_other_user_row` is the much stronger claim: it
 *  crosses two distinct User rows that share an address, which is the shape the original defect
 *  could only ever produce. Surfaced per row so a reviewer can see which rule fired. */
export type RepairResolvedBy = 'same_user' | 'same_email_other_user_row';

export interface RepairProfileSummary {
  id: number;
  user_id: number;
  username: string;
  email: string;
  client_id: number;
  client_slug: string | null;
  role: string;
}

/** One mis-linked row and the verdict on it. */
export interface RepairRow {
  /** Stringified backend-side: several of these models are UUID-keyed. */
  pk: string;
  /** The tenant the row itself is stamped with, which the repair treats as authoritative and
   *  never changes. The mis-link is the profile, not this. */
  row_client_id: number;
  current_profile: RepairProfileSummary | null;
  target_profile: RepairProfileSummary | null;
  action: 'rehome' | 'refuse';
  /** Present only when `action` is 'refuse'. */
  reason?: RepairRefusalReason;
  /** Present whenever a target was found, including on a row then refused for a collision or for
   *  an untrusted email match. A refused row can therefore still carry a `target_profile`: that is
   *  deliberate, it is the candidate the operator is being asked to look at rather than a move. */
  resolved_by?: RepairResolvedBy;
  /** Present only on the two collision reasons: the unique constraint that would be violated and
   *  the exact key the re-homed row would have landed on. */
  collision?: {
    constraint: string[];
    key: Record<string, string>;
  };
}

/** One boundary edge with something wrong on it. Edges that are clean are omitted entirely, so an
 *  empty `edges` means nothing in scope is broken, NOT that the purge is now possible. */
export interface RepairEdge {
  /** Django model label. Pairs with `field` to identify the edge, and the two together rebuild the
   *  blocker `key` this edge answers: `cross_tenant_cascade:{model}.{field}`. */
  model: string;
  field: string;
  parent: string;
  handler: string;
  /** Set when the edge could not be planned at all: the probe threw, or the model is reached by
   *  more than one audited profile edge and cannot be collision-checked one edge at a time. The
   *  edge is reported with an empty `rows` rather than dropped, because an edge silently missing
   *  from the plan reads as an edge that is fine. */
  error?: string;
  /** Execute only, and only when the write for THIS edge raised and was rolled back. Each edge
   *  commits in its own transaction, so this says nothing about the others: a zero `rehomed` next
   *  to it means "failed", not "nothing to do". */
  write_error?: string;
  /** Rows examined on this edge, capped at `row_limit`. Absent when `error` is set. */
  blocked_rows?: number;
  /** True when the edge has MORE broken rows than `row_limit`. What is shown is then a page, not
   *  the problem, and applying the repair will not clear the edge in one pass. */
  truncated?: boolean;
  rehomable?: number;
  refused?: number;
  rows: RepairRow[];
  /** Execute only: rows this call actually re-homed. May be lower than `rehomable`, because the
   *  write re-filters through the blocker queryset and skips anything already fixed in between. */
  rehomed?: number;
  /** Execute only: the edge re-counted afterwards through the refusal's OWN queryset. This is the
   *  honest "did it work" number. Non-zero means the edge still blocks the purge. */
  blocked_rows_after?: number;
  /** True means `blocked_rows_after` is a floor, not a fact: the count stops at the planner's cap
   *  so that the execute request cannot end with an unbounded COUNT(*) on the busiest table in the
   *  product. Render it as "N or more". */
  blocked_rows_after_capped?: boolean;
}

/** What `cross_tenant_cascade` still reports after an execute, straight from the planner. Present
 *  only on an execute response. Empty means no crossing of ANY kind is left, repairable or not. */
export interface RepairRemainingBlocker {
  key: string;
  model: string;
  field: string;
  parent: string;
  count: number;
  count_capped: boolean;
}

export interface RepairTotals {
  edges_affected: number;
  rows_found: number;
  rehomable: number;
  refused: number;
  /** Always 0 on a dry run. */
  rehomed: number;
}

/** The document both `execute: false` and `execute: true` return. */
export interface RepairPlan {
  client: { id: number; name: string; slug: string };
  generated_at: string;
  /** False on a dry run. The single field that says whether anything was written. */
  executed: boolean;
  /** Per-edge row ceiling the backend read under. */
  row_limit: number;
  /** Always false from this endpoint. The portal never acts on an identity inferred from a shared
   *  email address; see RepairRefusalReason. Surfaced so the receipt states which rule was in
   *  force rather than leaving a reader to assume. */
  trusted_email_identity: boolean;
  edges: RepairEdge[];
  totals: RepairTotals;
  /** Profile crossings the backend can SEE but will not repair, by name, because nobody has
   *  established whether the row's client or its profile is the authoritative column there. Named
   *  rather than counted: an earlier version repaired all 42 of these on the strength of one
   *  model's audit, which would have moved certificates, payments and proctoring records onto the
   *  wrong people. */
  unaudited_edges: string[];
  /** Execute only: the audit row id in superadmin_portal.CrossTenantRepair. Every move is recorded
   *  there with its from/to profile, because the purge this unblocks then deletes the source
   *  profiles and nothing else survives to say what happened. */
  audit_id?: number;
  /** The backend's own statement of what this tool does NOT cover, rendered verbatim rather than
   *  paraphrased so the portal cannot drift from the endpoint's idea of its own scope. */
  scope_note: string;
  /** One sentence written by the view, and the authority on whether anything was written: it is
   *  the only place "DRY RUN, nothing was written" is stated in words. Rendered verbatim for the
   *  same reason as `scope_note`. */
  summary: string;
  /** Only the management command asks for this. The endpoint does NOT re-run the ~99-edge sweep:
   *  it is the most expensive thing in the plan and would run after the writes have committed, so
   *  a 10s axios timeout there would leave the rows moved while the portal reported a failure. The
   *  portal re-runs the purge preview instead, which answers the same question. */
  blockers_remaining?: RepairRemainingBlocker[];
}

export interface RepairRequest {
  /** Dry run is the default on the backend and is sent explicitly here anyway: a repair that
   *  mutates because a field was omitted is one typo away from an accident. Parsed strictly on the
   *  backend (`_explicit_true`), so the string "false" is false, which it was not always. */
  execute: boolean;
  /** The client's name, typed by the operator, and REQUIRED whenever `execute` is true. Same gate
   *  as the purge itself: this writes to tenants that are not being deleted, so "I meant this
   *  institution" has to be stated, not inferred from which modal is open. */
  confirm_name?: string;
  /** Per-edge row ceiling. Omitted by the portal, which takes the backend default: the cap exists
   *  to keep this inside the 10s axios timeout and raising it from here would trade the operator's
   *  only working remedy for a request that dies halfway. */
  row_limit?: number;
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
