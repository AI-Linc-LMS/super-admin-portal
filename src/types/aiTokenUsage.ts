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

export interface AiUsageClientOption {
  client_id: number | null;
  client_name: string;
}

export interface AiTokenUsageParams {
  months?: number;
  client_id?: number;
  model?: string;
  feature?: string;
}

export interface AiTokenUsageSummary {
  filters: {
    months: number;
    client_id: number | null;
    model: string | null;
    feature: string | null;
  };
  totals: AiUsageTotals;
  current_month: AiUsageCurrentMonth;
  monthly: AiUsageMonthlyPoint[];
  by_client: AiUsageByClient[];
  by_model: AiUsageByModel[];
  by_feature: AiUsageByFeature[];
  available_clients: AiUsageClientOption[];
  available_models: string[];
  available_features: string[];
}
