export interface B2CFeaturePricing {
  feature_key: string;
  is_enabled: boolean;
  free_allowance: number;
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

export interface B2CConfigUpdate {
  is_enabled?: boolean;
  features?: Array<{
    feature_key: string;
    is_enabled?: boolean;
    free_allowance?: number;
  }>;
}

/** Human labels for the feature keys the backend ships. */
export const B2C_FEATURE_LABELS: Record<string, string> = {
  adaptive_course: 'Courses',
};
