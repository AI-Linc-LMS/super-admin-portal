import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Inbox, RefreshCw, ArrowUpRight } from 'lucide-react';
import { useTenantRequests } from '../hooks/useTenantRequests';
import TenantRequestDetailsModal from '../components/modals/TenantRequestDetailsModal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { cn } from '../utils/helpers';
import {
  ORG_TYPE_LABELS,
  LEARNER_BAND_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  TenantRequestStatus,
} from '../types/tenantRequest';

type Filter = TenantRequestStatus | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending_review', label: 'Pending' },
  { value: 'approved_setup', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

const TenantRequests: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('pending_review');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading, refetch, isFetching } = useTenantRequests({
    status: filter,
    search: search.trim() || undefined,
  });

  const counts = useMemo(() => {
    const all = data || [];
    return {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending_review').length,
    };
  }, [data]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <span className="kicker mb-3">
            <Inbox className="mr-2 h-3 w-3" />
            Provisioning queue
          </span>
          <h1 className="serif-display text-[40px] leading-[1.05] text-text">
            Tenant <span className="gradient-text">Requests</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-dim">
            Review and approve self-serve LMS provisioning requests from prospects on{' '}
            <span className="text-text">ailinc.com</span>.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          isLoading={isFetching}
          leftIcon={<RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />}
        >
          Refresh
        </Button>
      </motion.section>

      {/* Search + filter pill bar */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="relative overflow-hidden rounded-xl border border-themed surface-card p-4 shadow-glass"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/15 to-transparent"
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-[260px] flex-1">
            <Input
              leftIcon={<Search className="h-4 w-4" />}
              placeholder="Search by org name, contact, or reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-themed-2 bg-ink-1/40 p-1">
            {FILTERS.map((f) => {
              const isActive = filter === f.value;
              return (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    'rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold uppercase',
                    'tracking-widest2 transition-all duration-200',
                    isActive
                      ? 'bg-brand-cyan/15 text-brand-cyan shadow-[inset_0_0_0_1px_rgba(0,224,255,0.3)]'
                      : 'text-text-mute hover:text-text'
                  )}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
      </motion.section>

      {/* Table */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.12 }}
        className="relative overflow-hidden rounded-xl border border-themed surface-card shadow-glass"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent"
        />
        {isLoading ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-3 h-6 w-6 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
            <p className="font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
              Loading queue
            </p>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-themed bg-line/[0.03]">
              <Inbox className="h-6 w-6 text-text-mute" />
            </div>
            <h3 className="text-[16px] font-semibold text-text">No requests yet</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-text-dim">
              When prospects submit the “Create my LMS” form, requests will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-themed bg-ink-1/30">
                  {['Reference', 'Organisation', 'Contact', 'Learners', 'Status', 'Submitted'].map(
                    (h) => (
                      <th
                        key={h}
                        className="whitespace-nowrap px-6 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => setOpenId(r.id)}
                    className="group cursor-pointer border-b border-themed transition-colors
                      last:border-b-0 hover:bg-line/[0.03]"
                  >
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className="rounded-md border border-brand-cyan/25 bg-brand-cyan/[0.05] px-2 py-0.5 font-mono text-[12px] font-medium text-brand-cyan">
                        {r.reference_number}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-[14px] font-medium text-text">
                        {r.organisation_name}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                        {ORG_TYPE_LABELS[r.organisation_type] || r.organisation_type} · {r.country}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-[13px] text-text">{r.contact_name}</div>
                      <div className="text-[12px] text-text-dim">{r.contact_email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text">
                      {LEARNER_BAND_LABELS[r.expected_learner_band] || r.expected_learner_band}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2',
                          STATUS_TONE[r.status]
                        )}
                      >
                        {STATUS_LABELS[r.status]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] text-text-dim">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                        <ArrowUpRight className="h-3.5 w-3.5 text-text-mute opacity-0 transition-all group-hover:-translate-y-px group-hover:translate-x-px group-hover:text-brand-cyan group-hover:opacity-100" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>

      {data && data.length > 0 ? (
        <p className="text-right font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
          {counts.total} request{counts.total === 1 ? '' : 's'}
          {filter === 'pending_review'
            ? ''
            : ` · ${STATUS_LABELS[filter as TenantRequestStatus] || 'all'}`}
        </p>
      ) : null}

      <TenantRequestDetailsModal
        requestId={openId}
        isOpen={openId !== null}
        onClose={() => setOpenId(null)}
      />
    </div>
  );
};

export default TenantRequests;
