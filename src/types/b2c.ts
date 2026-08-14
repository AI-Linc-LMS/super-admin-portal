/** What a dial MEANS, sent by the server alongside its value.
 *
 * The free tier is a different shape per feature — "10" is ten assessments but ten *percent* of a
 * roadmap. The server ships the meaning with the value so this panel never has to hard-code it,
 * and so a feature added later explains itself without a frontend release. */
export interface B2CFeatureMeta {
  label?: string;
  free_unit?: string | null;
  free_help?: string;
  uses_unit_price?: boolean;
  price_help?: string;
  uses_preview?: boolean;
  preview_help?: string;
}

export interface B2CFeaturePricing {
  feature_key: string;
  is_enabled: boolean;
  free_allowance: number;
  /** Only for features with no product row of their own (interviews, ATS checks). */
  unit_price: string | null;
  currency: string;
  /** Roadmaps: how much of a locked path opens as a taste. */
  preview_percent: number;
  meta?: B2CFeatureMeta;
}

export interface B2CClientConfig {
  client_id: number;
  client_name: string;
  client_slug: string;
  is_enabled: boolean;
  features: B2CFeaturePricing[];
  /**
   * Whether the tenant can actually settle money. Reported separately from `is_enabled`
   * because a B2C tenant that cannot settle answers 402 on every priced course with no way
   * for the learner to pay — which reads as a broken storefront rather than a misconfiguration.
   */
  can_sell: boolean;
  cannot_sell_reason: string;
}

/** Every field optional: the panel patches ONE dial at a time. Resending values it did not change
 *  is how a stale number gets written back over a fresh one. */
export interface B2CConfigUpdate {
  is_enabled?: boolean;
  features?: Array<{
    feature_key: string;
    is_enabled?: boolean;
    free_allowance?: number;
    unit_price?: string | null;
    currency?: string;
    preview_percent?: number;
  }>;
}

/** Fallback labels only. The server sends `meta.label`; this covers a key added server-side
 *  before this file knows about it, so the panel degrades to a readable key rather than blank. */
export const B2C_FEATURE_LABELS: Record<string, string> = {
  adaptive_course: 'Courses',
  assessment: 'Assessments',
  mock_interview: 'Mock interviews',
  roadmap: 'Roadmaps',
  resume_ats: 'Resume ATS check',
};
