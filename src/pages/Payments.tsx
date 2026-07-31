import React from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Building2,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock3,
  Undo2,
  Receipt,
  Layers,
} from 'lucide-react';
import AnalyticsChart from '../components/charts/AnalyticsChart';
import {
  usePaymentsLedger,
  usePaymentsSummary,
  usePaymentsTenants,
} from '../hooks/usePayments';
import type { CurrencyTotal } from '../types/payments';
import { cn } from '../utils/helpers';

/**
 * Cross-client payments.
 *
 * The organising constraint: **money is never summed across currencies.** The platform sells in
 * ten, with three different minor-unit exponents, so one blended headline number would be
 * confidently wrong. Every total on this page carries its currency, and a tenant selling in two
 * currencies shows two figures rather than one lie.
 *
 * The second constraint: **there is no single "revenue".** A refund overwrites the transaction's
 * status in place, so it retroactively removes the original charge from the month it was earned
 * in. Charged / settled / reversed are shown side by side rather than collapsed.
 */

const MONTH_OPTIONS = [
  { label: 'Last 3 months', value: 3 },
  { label: 'Last 6 months', value: 6 },
  { label: 'Last 12 months', value: 12 },
  { label: 'Last 24 months', value: 24 },
];

const selectClass =
  'rounded-lg border border-themed bg-line/[0.03] px-3 py-2 text-sm text-text ' +
  'focus:border-brand-cyan/50 focus:outline-none';

/** Money, in its own currency, with the symbol the currency actually uses. */
const money = (amount: string, currency: string): string => {
  const n = Number(amount || 0);
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: n >= 1000 ? 0 : 2,
    }).format(n);
  } catch {
    // An unknown ISO code is better shown as "1,000 XYZ" than swallowed.
    return `${n.toLocaleString('en-US')} ${currency}`;
  }
};

const prettyMonth = (ym: string): string => {
  const [y, m] = (ym || '').split('-');
  if (!y || !m) return ym;
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  });
};

const prettyType = (t: string): string =>
  (t || 'other').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const STATUS_TONE: Record<string, string> = {
  VERIFIED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  SUCCESS: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  REFUNDED: 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold',
  DISPUTED: 'border-danger-500/30 bg-danger-500/10 text-danger-500',
  FAILED: 'border-danger-500/30 bg-danger-500/10 text-danger-500',
  EXPIRED: 'border-themed-2 bg-line/[0.04] text-text-mute',
};

const statusTone = (s: string) =>
  STATUS_TONE[s] ?? 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan';

/**
 * One money series, one card, one row per currency.
 *
 * This shape is the whole point: rows stack instead of adding up. A tenant taking INR and SAR
 * reads as two lines, which is the truth, rather than one number that is neither.
 */
const SeriesCard: React.FC<{
  title: string;
  hint: string;
  rows: CurrencyTotal[];
  tone: 'settled' | 'charged' | 'reversed';
  icon: React.ReactNode;
}> = ({ title, hint, rows, tone, icon }) => {
  const accent = {
    settled: 'text-emerald-400',
    charged: 'text-brand-cyan',
    reversed: 'text-brand-gold',
  }[tone];

  return (
    <div className="rounded-2xl border border-themed surface-card p-5">
      <div className="flex items-center justify-between">
        <p className={cn('kicker flex items-center gap-2', accent)}>
          {icon} {title}
        </p>
      </div>
      {rows.length === 0 ? (
        <p className="mt-4 text-2xl font-medium text-text-mute">—</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {rows.map((r) => (
            <div key={r.currency} className="flex items-baseline justify-between gap-3">
              <span className={cn('text-[26px] font-medium leading-tight text-text')}>
                {money(tone === 'reversed' ? r.refunded : r.gross, r.currency)}
              </span>
              <span className="text-xs text-text-mute">
                {r.currency} · {r.count.toLocaleString()} txn
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs leading-relaxed text-text-dim">{hint}</p>
    </div>
  );
};

const Payments: React.FC = () => {
  const [months, setMonths] = React.useState(12);
  const [clientId, setClientId] = React.useState<number | ''>('');
  const [paymentType, setPaymentType] = React.useState('');
  const [ledgerStatus, setLedgerStatus] = React.useState('');
  const [page, setPage] = React.useState(1);

  const summaryParams = React.useMemo(
    () => ({
      months,
      ...(clientId !== '' ? { client_id: clientId } : {}),
      ...(paymentType ? { payment_type: paymentType } : {}),
    }),
    [months, clientId, paymentType]
  );

  const ledgerParams = React.useMemo(
    () => ({
      page,
      limit: 25,
      ...(clientId !== '' ? { client_id: clientId } : {}),
      ...(paymentType ? { payment_type: paymentType } : {}),
      ...(ledgerStatus ? { status: ledgerStatus } : {}),
    }),
    [page, clientId, paymentType, ledgerStatus]
  );

  const { data, isLoading, error, isFetching } = usePaymentsSummary(summaryParams);
  const tenants = usePaymentsTenants();
  const ledger = usePaymentsLedger(ledgerParams);

  // Filters are keyed on primitives, and changing one resets the page — otherwise page 4 of a
  // 2-page result set renders empty and reads as "no payments".
  React.useEffect(() => {
    setPage(1);
  }, [clientId, paymentType, ledgerStatus]);

  const cannotSell = (tenants.data?.results ?? []).filter(
    (t) => t.has_credentials && !t.can_sell
  );

  const chartData = (data?.monthly ?? []).map((m) => {
    // The chart can only plot one number per month, so it plots the dominant currency and says
    // so. Adding the others in would be the exact mistake the rest of the page avoids.
    const top = [...m.by_currency].sort((a, b) => Number(b.gross) - Number(a.gross))[0];
    return {
      label: prettyMonth(m.month),
      gross: Number(top?.gross ?? 0),
      currency: top?.currency ?? '',
    };
  });
  const chartCurrency = chartData.length
    ? chartData[chartData.length - 1].currency
    : '';
  const mixedCurrencies = new Set(chartData.map((d) => d.currency).filter(Boolean)).size > 1;

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-2xl border border-themed surface-card p-7"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl"
        />
        <p className="kicker mb-2 flex items-center gap-2 text-emerald-400">
          <Wallet className="h-3.5 w-3.5" /> Revenue · Cross-tenant
        </p>
        <h1 className="serif-display text-[32px] font-medium leading-tight text-text">Payments</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-dim">
          Every payment taken across the platform, grouped by currency and never summed across
          them — tenants sell in ten currencies with three different minor-unit systems, so a
          single blended figure would be wrong rather than convenient.
        </p>
      </motion.div>

      {/* Tenants that are connected but cannot actually take money. This is the one thing on the
          page that is urgent, so it sits above the numbers rather than in a table below them. */}
      {cannotSell.length > 0 && (
        <div className="rounded-xl border border-brand-gold/30 bg-brand-gold/5 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-brand-gold">
            <ShieldAlert className="h-4 w-4" />
            {cannotSell.length} tenant{cannotSell.length === 1 ? '' : 's'} connected but unable to
            complete a sale
          </p>
          <ul className="mt-2 space-y-1 text-xs text-text-dim">
            {cannotSell.slice(0, 6).map((t) => (
              <li key={t.client_id}>
                <span className="text-text">{t.name}</span> — {t.blocked_reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
        >
          {MONTH_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={clientId}
          onChange={(e) => setClientId(e.target.value === '' ? '' : Number(e.target.value))}
        >
          <option value="">All tenants</option>
          {(tenants.data?.results ?? []).map((t) => (
            <option key={t.client_id} value={t.client_id}>
              {t.name}
            </option>
          ))}
        </select>

        <select
          className={selectClass}
          value={paymentType}
          onChange={(e) => setPaymentType(e.target.value)}
        >
          <option value="">All products</option>
          {Array.from(new Set((data?.by_product ?? []).map((p) => p.payment_type))).map((t) => (
            <option key={t} value={t}>
              {prettyType(t)}
            </option>
          ))}
        </select>

        {isFetching && (
          <span className="flex items-center gap-2 text-xs text-text-mute">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
            Updating…
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-danger-500/30 bg-danger-500/5 p-4 text-sm text-danger-500">
          <AlertTriangle className="h-4 w-4" />
          Couldn’t load payments. Confirm you’re signed in as a super-admin and the backend is
          reachable. Nothing is shown rather than an estimate — a made-up revenue figure is worse
          than none.
        </div>
      )}

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
          <span className="ml-3 text-text-dim">Loading payments…</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <SeriesCard
              title="Settled"
              hint="Held right now. This figure goes down when a refund is issued."
              rows={data?.settled ?? []}
              tone="settled"
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            />
            <SeriesCard
              title="Charged"
              hint="Everything ever collected in this window, including payments later refunded. This is the figure that does not change retroactively."
              rows={data?.charged ?? []}
              tone="charged"
              icon={<Receipt className="h-3.5 w-3.5" />}
            />
            <SeriesCard
              title="Refunded & disputed"
              hint="Money returned. A refund also rewrites its transaction's status, which is why 'settled' alone cannot be trusted as history."
              rows={data?.reversed ?? []}
              tone="reversed"
              icon={<Undo2 className="h-3.5 w-3.5" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
            <MiniStat
              label="In progress"
              value={data?.pending_count ?? 0}
              hint="Checkouts opened in the last 6 hours"
              icon={<Clock3 className="h-4 w-4" />}
              tone="text-brand-cyan"
            />
            <MiniStat
              label="Abandoned"
              value={data?.abandoned_count ?? 0}
              hint="Opened and never completed"
              icon={<Clock3 className="h-4 w-4" />}
              tone="text-text-mute"
            />
            <MiniStat
              label="Tenants able to sell"
              value={`${tenants.data?.can_sell_count ?? 0} / ${tenants.data?.count ?? 0}`}
              hint="Keys active and a webhook configured"
              icon={<Building2 className="h-4 w-4" />}
              tone="text-emerald-400"
            />
            <MiniStat
              label="Settling to us"
              value={(data?.platform_vs_institution.platform ?? [])
                .map((r) => money(r.gross, r.currency))
                .join(' · ') || '—'}
              hint="Everything else is held in the institution's own Razorpay account"
              icon={<Wallet className="h-4 w-4" />}
              tone="text-brand-gold"
            />
          </div>

          <div className="rounded-2xl border border-themed surface-card p-1">
            <AnalyticsChart
              title={`Charged per month${chartCurrency ? ` · ${chartCurrency}` : ''}`}
              kicker={
                mixedCurrencies
                  ? 'Dominant currency per month — currencies are not combined'
                  : 'Collected'
              }
              type="area"
              data={chartData}
              dataKey="gross"
              xAxisKey="label"
              color="#34d399"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Panel title="By tenant" icon={<Building2 className="h-3.5 w-3.5" />}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-mute">
                    <th className="pb-2 font-medium">Tenant</th>
                    <th className="pb-2 text-right font-medium">Charged</th>
                    <th className="pb-2 text-right font-medium">Settles to</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.by_client ?? []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-text-mute">
                        No payments in this window
                      </td>
                    </tr>
                  )}
                  {(data?.by_client ?? []).map((r) => (
                    <tr key={`${r.client_id}-${r.currency}`} className="border-t border-themed-2">
                      <td className="py-2.5 text-text">{r.client_name}</td>
                      <td className="py-2.5 text-right text-text">
                        {money(r.gross, r.currency)}
                        <span className="ml-2 text-xs text-text-mute">{r.count}</span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-xs',
                            r.settles_to === 'platform'
                              ? 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold'
                              : 'border-themed-2 bg-line/[0.04] text-text-mute'
                          )}
                        >
                          {r.settles_to === 'platform' ? 'Us' : 'Institution'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>

            <Panel title="By product" icon={<Layers className="h-3.5 w-3.5" />}>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-mute">
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 text-right font-medium">Charged</th>
                    <th className="pb-2 text-right font-medium">Txns</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.by_product ?? []).length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-text-mute">
                        No payments in this window
                      </td>
                    </tr>
                  )}
                  {(data?.by_product ?? []).map((r) => (
                    <tr
                      key={`${r.payment_type}-${r.currency}`}
                      className="border-t border-themed-2"
                    >
                      <td className="py-2.5 text-text">{prettyType(r.payment_type)}</td>
                      <td className="py-2.5 text-right text-text">
                        {money(r.gross, r.currency)}
                      </td>
                      <td className="py-2.5 text-right text-text-mute">{r.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          </div>

          {/* Tenant readiness. "Connected" is not the same as "can take money": the connected flag
              ignores the webhook, and without one a payment can be taken and never confirmed. */}
          <Panel title="Tenant readiness" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-text-mute">
                  <th className="pb-2 font-medium">Tenant</th>
                  <th className="pb-2 font-medium">Key</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 text-right font-medium">Collected</th>
                </tr>
              </thead>
              <tbody>
                {(tenants.data?.results ?? [])
                  .filter((t) => t.has_credentials || t.gross_by_currency.length > 0)
                  .map((t) => (
                    <tr key={t.client_id} className="border-t border-themed-2">
                      <td className="py-2.5 text-text">{t.name}</td>
                      <td className="py-2.5 font-mono text-xs text-text-mute">
                        {t.key_id_masked || '—'}
                      </td>
                      <td className="py-2.5">
                        {t.can_sell ? (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-400">
                            Selling
                          </span>
                        ) : (
                          <span
                            className="rounded-full border border-brand-gold/30 bg-brand-gold/10 px-2 py-0.5 text-xs text-brand-gold"
                            title={t.blocked_reason}
                          >
                            {t.webhook_configured ? 'Paused' : 'No webhook'}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right text-text">
                        {t.gross_by_currency.length === 0
                          ? '—'
                          : t.gross_by_currency
                              .map((g) => money(g.gross, g.currency))
                              .join(' · ')}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </Panel>

          <Panel
            title="Ledger"
            icon={<Receipt className="h-3.5 w-3.5" />}
            action={
              <select
                className={selectClass}
                value={ledgerStatus}
                onChange={(e) => setLedgerStatus(e.target.value)}
              >
                <option value="">All statuses</option>
                {['VERIFIED', 'REFUNDED', 'DISPUTED', 'FAILED', 'INITIATED', 'EXPIRED'].map((s) => (
                  <option key={s} value={s}>
                    {prettyType(s)}
                  </option>
                ))}
              </select>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-text-mute">
                    <th className="pb-2 font-medium">When</th>
                    <th className="pb-2 font-medium">Tenant</th>
                    <th className="pb-2 font-medium">Buyer</th>
                    <th className="pb-2 font-medium">Item</th>
                    <th className="pb-2 text-right font-medium">Amount</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledger.data?.results ?? []).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-text-mute">
                        No transactions match these filters
                      </td>
                    </tr>
                  )}
                  {(ledger.data?.results ?? []).map((t) => (
                    <tr key={t.id} className="border-t border-themed-2">
                      <td className="py-2.5 text-text-dim">
                        {new Date(t.created_at).toLocaleDateString('en-US', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="py-2.5 text-text">{t.client_name}</td>
                      <td className="py-2.5 text-text-dim">{t.buyer_email || '—'}</td>
                      <td className="py-2.5 text-text-dim">
                        {t.product_title || prettyType(t.payment_type)}
                      </td>
                      <td className="py-2.5 text-right text-text">
                        {money(t.amount, t.currency)}
                        {t.refunded_amount && Number(t.refunded_amount) > 0 && (
                          <span className="ml-2 text-xs text-brand-gold">
                            −{money(t.refunded_amount, t.currency)}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            'rounded-full border px-2 py-0.5 text-xs',
                            statusTone(t.status)
                          )}
                        >
                          {prettyType(t.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(ledger.data?.count ?? 0) > 25 && (
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-text-mute">
                  {(ledger.data!.page - 1) * ledger.data!.page_size + 1}–
                  {Math.min(ledger.data!.page * ledger.data!.page_size, ledger.data!.count)} of{' '}
                  {ledger.data!.count.toLocaleString()}
                </span>
                <div className="flex gap-2">
                  <button
                    className="rounded-lg border border-themed px-3 py-1.5 text-text-dim disabled:opacity-40"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </button>
                  <button
                    className="rounded-lg border border-themed px-3 py-1.5 text-text-dim disabled:opacity-40"
                    disabled={page * 25 >= (ledger.data?.count ?? 0)}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
};

const MiniStat: React.FC<{
  label: string;
  value: React.ReactNode;
  hint: string;
  icon: React.ReactNode;
  tone: string;
}> = ({ label, value, hint, icon, tone }) => (
  <div className="rounded-2xl border border-themed surface-card p-5">
    <p className={cn('kicker flex items-center gap-2', tone)}>
      {icon} {label}
    </p>
    <p className="mt-2 text-2xl font-medium leading-tight text-text">{value}</p>
    <p className="mt-1.5 text-xs text-text-dim">{hint}</p>
  </div>
);

const Panel: React.FC<{
  title: string;
  icon: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, action, children }) => (
  <div className="rounded-2xl border border-themed surface-card p-5">
    <div className="mb-3 flex items-center justify-between gap-3">
      <p className="kicker flex items-center gap-2 text-text-dim">
        {icon} {title}
      </p>
      {action}
    </div>
    {children}
  </div>
);

export default Payments;
