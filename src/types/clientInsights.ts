/**
 * Per-client insight: who turned up, and what they cost.
 *
 * Mirrors `superadmin_portal/client_insights.py`. Two fields exist purely so the UI can be
 * honest rather than tidy, and both must be rendered:
 *
 *  - `unattributed_usd` — spend with no person behind it (course builds, dashboard briefings,
 *    sweeps). Measured at ~9.8% of spend on production. The people list covers only
 *    `attributed_usd`, so showing the list beside `total_usd` without this would read as the
 *    whole bill being accounted for by name.
 *  - `people_truncated` — the list is capped. A capped list presented as complete is the same
 *    lie in a different place.
 */

export interface ClientInsightsWindow {
  days: number;
  from: string;
  to: string;
}

export interface ActivePoint {
  date: string;
  users: number;
  /** Time anywhere in the app — this is what "active" counts. */
  minutes: number;
  /** The subset spent on a learning surface. Always <= minutes. */
  learning_minutes: number;
}

export interface ClientInsightsActive {
  series: ActivePoint[];
  /** Distinct people over the whole window. NOT the sum of the daily counts. */
  distinct_total: number;
  peak_day_users: number;
  today_users: number;
}

export interface CostPoint {
  date: string;
  cost_usd: number;
  tokens: number;
}

export interface ClientInsightsCost {
  series: CostPoint[];
  total_usd: number;
  total_tokens: number;
  events: number;
  /** The slice the people list can account for by name. */
  attributed_usd: number;
  /** The slice it cannot: background work with no person behind it. */
  unattributed_usd: number;
}

export interface InsightPerson {
  user_id: number;
  email: string;
  name: string;
  role: string | null;
  /** Days they appeared at all. 0 means they spent without a tracked visit. */
  active_days: number;
  minutes: number;
  learning_minutes: number;
  last_active: string | null;
  cost_usd: number;
  tokens: number;
  ai_events: number;
}

export interface ClientInsights {
  client: { id: number; name: string; slug: string; is_active: boolean };
  window: ClientInsightsWindow;
  active: ClientInsightsActive;
  cost: ClientInsightsCost;
  people: InsightPerson[];
  people_truncated: boolean;
}
