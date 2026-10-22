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

/**
 * One day's count of people who were ON the platform.
 *
 * NOT logins. Nothing records a login: `User.last_login` is overwritten on every sign-in, so it
 * holds one timestamp per person and cannot say who signed in on a given past day. This is the
 * same measure the per-client insights panel shows - distinct learners with tracked time - and
 * it excludes admins and instructors.
 */
export interface AiPeopleDay {
  date: string;        // YYYY-MM-DD
  /** Distinct students active that day. */
  users: number;
  /** Distinct STAFF active that day - admins, instructors, course managers. Never pooled with
   *  `users`: pooling is what once reported a tenant at 137.5% engaged, and on a cost page it
   *  would make staff work look like learner demand. */
  staff: number;
  minutes: number;
  learning_minutes: number;
  staff_minutes: number;
}

export interface AiPeopleSeries {
  /** One entry per day in the window, zero-filled. Same length and order as `dates`. */
  series: AiPeopleDay[];
  /** Distinct people over the WHOLE window. Never the sum of `series` - returning learners. */
  distinct_total: number;
  staff_distinct_total: number;
  peak_day: { date: string; users: number } | null;
  today_users: number;
  today_staff: number;
  active_days: number;
}

/** One member of staff who spent money on AI in the window. */
export interface AiStaffSpender {
  user_id: number;
  client_id: number | null;
  client_name: string;
  email: string;
  name: string;
  /** 'admin' | 'instructor' | 'course_manager' | 'superadmin' | 'recruiter' | 'unknown'. */
  role: string;
  cost_usd: number;
  tokens: number;
  events: number;
}

/**
 * AI spend attributable to staff rather than learners.
 *
 * Unlike `people`, this IS derived from the usage ledger, so it responds to the
 * feature/model/module filters exactly as the rest of the page does.
 */
export interface AiTokenUser extends AiStaffSpender {
  /** False for a learner, and false for someone with no profile on the spend's tenant. */
  is_staff: boolean;
}

/** One person on one day: whether they visited, what they spent, and whose tenant they are. */
export interface AiDayPerson {
  user_id: number;
  client_id: number | null;
  client_name: string;
  email: string;
  name: string;
  role: string;
  is_staff: boolean;
  /** False means they spent without a tracked session - a background task acting for them. */
  visited: boolean;
  minutes: number;
  learning_minutes: number;
  cost_usd: number;
  tokens: number;
  events: number;
}

export interface AiDayDetail {
  date: string;
  people: AiDayPerson[];
  totals: {
    people: number;
    visited: number;
    spenders: number;
    cost_usd: number;
    tokens: number;
  };
}

export interface AiStaffUsage {
  cost_usd: number;
  tokens: number;
  events: number;
  people: AiStaffSpender[];
}

export interface AiCostDailyMatrix {
  filters: { days: number; feature: string | null; model: string | null; module: string | null };
  window: { start: string; end: string; days: number };
  /** Every date in the window, in order. The heatmap's x axis. */
  dates: string[];
  clients: AiCostClientRow[];
  daily_totals: AiCostDayTotal[];
  /** Platform-wide active people per day. Unaffected by the feature/model/module filters. */
  people: AiPeopleSeries;
  /** Who among staff is spending on AI. A derived SUBSET of `token_users`. */
  staff_ai: AiStaffUsage;
  /** Everyone who spent, learners included, each with the tenant they belong to. */
  token_users: { cost_usd: number; tokens: number; events: number; people: AiTokenUser[] };
  /** Present only when `date` was requested. A drill-down, not a filter. */
  day_detail: AiDayDetail | null;
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
  /** YYYY-MM-DD. Opens one day's people detail; ignored if outside the window. */
  date?: string;
}
