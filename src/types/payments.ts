/**
 * Cross-client payment reporting.
 *
 * Every money figure arrives as a STRING paired with its currency, never as a number and never
 * pre-summed. The platform sells in ten currencies with three different minor-unit exponents, so
 * a single blended total would be wrong; the backend refuses to produce one and this UI must not
 * invent one either.
 */

export interface CurrencyTotal {
  currency: string;
  gross: string;
  refunded: string;
  count: number;
}

export interface MonthlyPoint {
  month: string;
  by_currency: { currency: string; gross: string; count: number }[];
}

export interface ClientTotal {
  client_id: number;
  client_name: string;
  currency: string;
  gross: string;
  count: number;
  settles_to: 'platform' | 'institution';
}

export interface ProductTotal {
  payment_type: string;
  currency: string;
  gross: string;
  count: number;
}

export interface PaymentsSummary {
  filters: {
    months: number;
    client_id: string | null;
    payment_type: string | null;
    currency: string | null;
  };
  /** Ever collected, including what was later refunded. Stable over time. */
  charged: CurrencyTotal[];
  /** Held right now. Shrinks when a refund rewrites a row's status. */
  settled: CurrencyTotal[];
  reversed: CurrencyTotal[];
  pending_count: number;
  abandoned_count: number;
  monthly: MonthlyPoint[];
  by_client: ClientTotal[];
  by_product: ProductTotal[];
  platform_vs_institution: {
    platform: CurrencyTotal[];
    institution: CurrencyTotal[];
  };
  note: string;
}

export interface TenantPaymentRow {
  client_id: number;
  name: string;
  has_credentials: boolean;
  is_active: boolean;
  webhook_configured: boolean;
  /** Stricter than "connected": a tenant can be connected and still 402 at checkout. */
  can_sell: boolean;
  blocked_reason: string;
  settles_to: 'platform' | 'institution' | null;
  key_id_masked: string;
  gross_by_currency: { currency: string; gross: string; count: number }[];
}

export interface TenantsReport {
  count: number;
  can_sell_count: number;
  results: TenantPaymentRow[];
}

export interface LedgerRow {
  id: number;
  client_id: number;
  client_name: string;
  buyer_email: string;
  payment_type: string;
  type_id: string;
  product_title: string;
  amount: string;
  currency: string;
  status: string;
  created_at: string;
  settled_at: string | null;
  settled_by: string;
  refunded_at: string | null;
  refunded_amount: string | null;
  razorpay_order_id: string;
  razorpay_payment_id: string;
}

export interface LedgerPage {
  count: number;
  page: number;
  page_size: number;
  results: LedgerRow[];
}

export interface PaymentsSummaryParams {
  months?: number;
  client_id?: number;
  payment_type?: string;
  currency?: string;
}

export interface LedgerParams {
  page?: number;
  limit?: number;
  client_id?: number;
  status?: string;
  payment_type?: string;
  currency?: string;
}
