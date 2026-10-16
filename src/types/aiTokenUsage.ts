// Shapes returned by GET /superadmin/api/ai-usage/summary/

export interface AiUsageRow {
  total_tokens: number;
  prompt_tokens: number;
  completion_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  events: number;
}

export interface AiUsageTotals extends AiUsageRow {
  clients: number;
  window: { start: string; end: string; months: number };
}

export interface AiUsageCurrentMonth extends AiUsageRow {
  year_month: string;
}

export interface AiUsageMonthlyPoint extends AiUsageRow {
  year_month: string;
  /** Granularity-neutral key: `YYYY-MM` for months, an ISO date for days and weeks. */
  bucket?: string;
}

/** One point of the time series, whatever the granularity. */
export interface AiUsageSeriesPoint extends AiUsageRow {
  bucket: string;
}

export interface AiUsageByClient extends AiUsageRow {
  client_id: number | null;
  client_name: string;
}

export interface AiUsageByModel extends AiUsageRow {
  model: string;
}

export interface AiUsageByFeature extends AiUsageRow {
  feature: string;
}

/** One surface (a `feature` string) shown beneath the module it belongs to. */
export interface AiUsageSurface extends AiUsageRow {
  feature: string;
  surface_label: string;
}

/**
 * A product module and the surfaces that make it up. The module total is summed from exactly
 * the surfaces listed in `surfaces`, so the header always equals its own rows.
 */
export interface AiUsageByModule extends AiUsageRow {
  module: string;
  module_label: string;
  blurb: string;
  surfaces: AiUsageSurface[];
  /** Cost of one call — separates "expensive per call" from "merely busy". */
  cost_per_event: number;
  tokens_per_event: number;
  /** Share of input tokens served from OpenAI's prompt cache. */
  cache_hit_pct: number;
}

export interface AiUsageModuleOption {
  module: string;
  module_label: string;
  blurb: string;
  surfaces: { feature: string; surface_label: string }[];
}

/** One row of the integrity panel: money sitting in a bucket nobody can explain. */
export interface AiUsageIntegrityCheck {
  key: string;
  label: string;
  severity: 'high' | 'medium' | 'low' | 'ok' | 'info';
  rows: number;
  cost_usd: number;
  detail: string;
  share_pct?: number;
  tokens?: number;
  models?: string[];
  features?: string[];
  keyed_rows?: number;
  total_rows?: number;
  first_event?: string | null;
}

export interface AiUsageIntegrity {
  total_cost_usd: number;
  total_rows: number;
  /** Spend that could be charged to a surface — the headline minus the unlabelled bucket. */
  attributed_cost_usd: number;
  attributed_pct: number;
  checks: AiUsageIntegrityCheck[];
}

export interface AiUsageModuleDetail {
  module: string;
  module_label: string;
  blurb: string;
  known: boolean;
  window: { start: string; end: string; months: number };
  totals: AiUsageRow & {
    cost_per_event: number;
    tokens_per_event: number;
    cache_hit_pct: number;
  };
  monthly: AiUsageMonthlyPoint[];
  by_surface: (AiUsageRow & { feature: string; surface_label: string; cost_per_event: number })[];
  by_model: (AiUsageRow & { model: string; cost_per_event: number })[];
  by_client: (AiUsageRow & {
    client_id: number | null;
    client_name: string;
    cost_per_event: number;
  })[];
  top_calls: {
    id: number;
    created_at: string;
    model: string;
    feature: string;
    surface_label: string;
    client_id: number | null;
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    cost_usd: number;
    meta: Record<string, unknown>;
  }[];
}

export interface AiUsageClientOption {
  client_id: number | null;
  client_name: string;
}

export interface AiTokenUsageParams {
  months?: number;
  /** Day window. Wins over `weeks` and `months` when sent. */
  days?: number;
  /** Week window (ISO weeks, Monday-based). Wins over `months`. */
  weeks?: number;
  client_id?: number;
  model?: string;
  feature?: string;
  module?: string;
}

export interface AiTokenUsageSummary {
  filters: {
    months: number;
    client_id: number | null;
    model: string | null;
    feature: string | null;
    module: string | null;
    days?: number | null;
    weeks?: number | null;
  };
  totals: AiUsageTotals;
  current_month: AiUsageCurrentMonth;
  monthly: AiUsageMonthlyPoint[];
  series: AiUsageSeriesPoint[];
  granularity: 'day' | 'week' | 'month';
  by_client: AiUsageByClient[];
  by_model: AiUsageByModel[];
  by_feature: AiUsageByFeature[];
  by_module: AiUsageByModule[];
  available_clients: AiUsageClientOption[];
  available_models: string[];
  available_features: string[];
  available_modules: AiUsageModuleOption[];
}
