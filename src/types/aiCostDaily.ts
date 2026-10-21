/** The cross-tenant daily cost matrix: `GET /superadmin/api/ai-usage/daily-matrix/`. */

export interface AiCostCell {
  date: string;        // YYYY-MM-DD
  cost_usd: number;
  tokens: number;
  events: number;
}

export interface AiCostClientRow {
  client_id: number | null;   // null = platform / internal
  client_name: string;
  is_platform: boolean;
  /** One cell per day in the window, zero-filled. Same length as `dates`. */
  cells: AiCostCell[];
  total_cost_usd: number;
  total_tokens: number;
  total_events: number;
  active_days: number;
  peak: { date: string; cost_usd: number };
  avg_cost_per_active_day: number;
}

export interface AiCostDayTotal extends AiCostCell {
  active_clients: number;
}

export interface AiCostDailyMatrix {
  filters: { days: number; feature: string | null; model: string | null; module: string | null };
  window: { start: string; end: string; days: number };
  /** Every date in the window, in order. The heatmap's x axis. */
  dates: string[];
  clients: AiCostClientRow[];
  daily_totals: AiCostDayTotal[];
  totals: {
    cost_usd: number;
    tokens: number;
    events: number;
    /** Tenants only. Platform/internal spend is in `cost_usd` but is nobody's tenant. */
    clients: number;
    active_days: number;
    busiest_day: AiCostDayTotal | null;
    peak_cell_usd: number;
  };
  available_features: string[];
  available_models: string[];
  available_modules: { module: string; module_label: string; blurb?: string }[];
}

export interface AiCostDailyParams {
  days?: number;
  feature?: string;
  model?: string;
  module?: string;
}
