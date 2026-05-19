import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Info,
  ShieldAlert,
  Rocket,
  ExternalLink,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { cn } from '../../utils/helpers';
import {
  ORG_TYPE_LABELS,
  LEARNER_BAND_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
  WIZARD_STEP_TITLES,
  type WizardProgress,
  type ProvisioningSnapshot,
} from '../../types/tenantRequest';
import {
  useApproveTenantRequest,
  useCheckSubdomain,
  useRejectTenantRequest,
  useRetryProvisioning,
  useTenantRequest,
} from '../../hooks/useTenantRequests';

interface Props {
  requestId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

type Availability = { ok: boolean; reason?: string } | null;

const AvailabilityIndicator: React.FC<{
  loading: boolean;
  value: Availability;
}> = ({ loading, value }) => {
  if (loading) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-text-mute">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking…
      </p>
    );
  }
  if (!value) return null;
  if (value.ok) {
    return (
      <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> Available
      </p>
    );
  }
  return (
    <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[11px] text-danger-500">
      <AlertCircle className="h-3 w-3" /> {value.reason || 'Unavailable'}
    </p>
  );
};

const slugify = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div>
    <dt className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
      {label}
    </dt>
    <dd className="mt-1 text-[14px] text-text">{children}</dd>
  </div>
);

const WizardProgressPanel: React.FC<{
  progress: WizardProgress;
  subdomain: string;
}> = ({ progress, subdomain }) => {
  const total = progress.total_steps || WIZARD_STEP_TITLES.length;
  const step = Math.max(0, Math.min(progress.setup_step ?? 0, total));
  const percent = progress.setup_completed
    ? 100
    : Math.round((step / total) * 100);
  const currentLabel = progress.setup_completed
    ? 'Launched'
    : step >= 1 && step <= WIZARD_STEP_TITLES.length
      ? WIZARD_STEP_TITLES[step - 1]
      : 'Not started';
  const lmsUrl = subdomain ? `https://${subdomain}.ailinc.com` : null;
  const stateEntries = Object.entries(progress.wizard_state || {}).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );

  return (
    <div className="rounded-lg border border-themed bg-line/[0.02] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-brand-cyan">
          <Rocket className="h-3 w-3" /> Setup progress
        </div>
        {progress.setup_completed && lmsUrl ? (
          <a
            href={lmsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-emerald-400 hover:bg-emerald-500/15"
          >
            Live <ExternalLink className="h-3 w-3" />
          </a>
        ) : step === 0 ? (
          <span className="rounded-md border border-themed-2 bg-line/[0.04] px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
            Not started
          </span>
        ) : (
          <span className="rounded-md border border-brand-gold/30 bg-brand-gold/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-brand-gold">
            In wizard
          </span>
        )}
      </div>

      <div className="flex items-baseline justify-between text-[13px]">
        <span className="text-text">{currentLabel}</span>
        <span className="font-mono text-text-dim">
          Step {step} / {total}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/[0.06]">
        <div
          className={cn(
            'h-full transition-all',
            progress.setup_completed ? 'bg-emerald-400' : 'bg-brand-cyan'
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {progress.launched_at ? (
        <p className="mt-3 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
          Launched · {new Date(progress.launched_at).toLocaleString()}
        </p>
      ) : null}

      {stateEntries.length > 0 ? (
        <details className="mt-3 text-[12px] text-text-dim">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-widest2 text-text-mute hover:text-text">
            View wizard answers ({stateEntries.length})
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded-md border border-themed bg-ink-1/40 p-3 text-[11px] leading-relaxed text-text">
            {JSON.stringify(progress.wizard_state, null, 2)}
          </pre>
        </details>
      ) : null}
    </div>
  );
};

/**
 * Pipeline that we ALWAYS render in this order, regardless of whether the
 * backend has logged each step yet. Pending steps render as ghost nodes so
 * the admin sees the full shape of "what's about to happen" the moment the
 * task is queued, not just the steps that have already executed.
 *
 * Skipped DNS / Google OAuth no-ops are intentionally NOT in this list —
 * they're audit-trail entries from `provisioning/tasks.py`, not real progress.
 */
const PIPELINE: { key: string; title: string; hint: string }[] = [
  { key: 'start', title: 'Spinning up', hint: 'Provisioning starts' },
  { key: 'netlify_create', title: 'Materialising tenant site', hint: 'Netlify site appears' },
  { key: 'netlify_env', title: 'Wiring environment', hint: 'Secrets, slug, OAuth' },
  { key: 'netlify_alias', title: 'Binding subdomain', hint: '<slug>.ailinc.com' },
  { key: 'netlify_build', title: 'Building & deploying', hint: 'Next.js → CDN' },
  { key: 'done', title: 'Live', hint: 'Open for traffic' },
];

type StepState = 'pending' | 'active' | 'complete' | 'warn' | 'failed';

const STATE_FROM_LOG: Record<string, StepState> = {
  ok: 'complete',
  queued: 'complete',
  reused: 'complete',
  started: 'active',
  warn: 'warn',
  failed: 'failed',
};

const ProvisioningPanel: React.FC<{
  snapshot: ProvisioningSnapshot;
  onRetry: () => void;
  retrying: boolean;
}> = ({ snapshot, onRetry, retrying }) => {
  const status = snapshot.status;

  // Latest entry per step key — backend appends; we want only the freshest.
  const latestByStep = useMemo(() => {
    const map = new Map<string, ProvisioningSnapshot['log'][number]>();
    for (const e of snapshot.log) map.set(e.step, e);
    return map;
  }, [snapshot.log]);

  const errorEntry = latestByStep.get('error');

  // Compute state for each pipeline step.
  const steps = useMemo(() => {
    return PIPELINE.map((p, i) => {
      const entry = latestByStep.get(p.key);
      let state: StepState = 'pending';
      if (entry) state = STATE_FROM_LOG[entry.status] || 'complete';
      return { ...p, index: i, state, entry };
    });
  }, [latestByStep]);

  // If the overall task failed but the per-step log doesn't show which step
  // tripped it, attribute the failure to the first non-complete step so the
  // visual matches the task-level state.
  const stepsWithFailure = useMemo(() => {
    if (status !== 'failed') return steps;
    if (steps.some((s) => s.state === 'failed')) return steps;
    const firstIncomplete = steps.findIndex((s) => s.state !== 'complete');
    if (firstIncomplete < 0) return steps;
    return steps.map((s, i) =>
      i === firstIncomplete ? { ...s, state: 'failed' as StepState } : s,
    );
  }, [steps, status]);

  const lastCompleteIdx = (() => {
    let idx = -1;
    stepsWithFailure.forEach((s, i) => {
      if (s.state === 'complete') idx = i;
    });
    return idx;
  })();

  return (
    <div className="relative overflow-hidden rounded-xl border border-brand-cyan/15 p-5"
      style={{
        background:
          'radial-gradient(ellipse 80% 70% at 20% 0%, rgba(35,86,214,0.12), transparent 60%),' +
          'radial-gradient(ellipse 60% 50% at 90% 100%, rgba(0,224,255,0.08), transparent 65%),' +
          'rgba(10,18,40,0.35)',
      }}
    >
      {/* faint grid texture, ailinc-in style */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
          mixBlendMode: 'overlay',
        }}
      />

      {/* Header */}
      <div className="relative mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span
            className="inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.32em]"
            style={{
              background: 'linear-gradient(90deg, #2356d6 0%, #00e0ff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            <Rocket className="h-3 w-3 text-brand-cyan" />
            Whitelabel provisioning
          </span>
          <h4 className="serif-display mt-2 text-[22px] leading-[1.05] text-text">
            {status === 'success'
              ? 'Your tenant is live'
              : status === 'failed'
                ? 'Provisioning halted'
                : status === 'in_progress'
                  ? 'Conjuring your LMS…'
                  : 'Queued · waiting for the worker'}
          </h4>
        </div>
        <StatusBadge status={status} liveUrl={snapshot.live_url} />
      </div>

      {/* The magical pipeline */}
      <ol className="relative space-y-3">
        {stepsWithFailure.map((step, i) => (
          <PipelineRow
            key={step.key}
            step={step}
            isLast={i === stepsWithFailure.length - 1}
            connectorActive={
              i < stepsWithFailure.length - 1 &&
              (step.state === 'complete' || stepsWithFailure[i + 1].state !== 'pending')
            }
            indexFromActive={lastCompleteIdx - i}
          />
        ))}
      </ol>

      {/* Error detail, only if the task-level catch-all has a message worth surfacing */}
      {status === 'failed' && errorEntry?.message ? (
        <div className="relative mt-5 rounded-lg border border-danger-500/25 bg-danger-500/[0.06] p-3">
          <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest2 text-danger-500">
            <AlertCircle className="h-3 w-3" /> Reason
          </div>
          <p className="break-all font-mono text-[11px] leading-relaxed text-text-dim">
            {errorEntry.message}
          </p>
        </div>
      ) : null}

      {/* Live celebration: huge gradient bloom + open-LMS CTA */}
      {status === 'success' && snapshot.live_url ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative mt-5 overflow-hidden rounded-xl border border-brand-cyan/30 p-4"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(0,224,255,0.18), transparent 60%),' +
              'linear-gradient(135deg, rgba(35,86,214,0.18), rgba(0,224,255,0.05))',
          }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 place-items-center rounded-full"
                style={{
                  background: 'linear-gradient(135deg, #00e0ff 0%, #2356d6 100%)',
                  boxShadow:
                    '0 0 0 4px rgba(0,224,255,0.12), 0 10px 40px -10px rgba(0,224,255,0.55)',
                }}
              >
                <Sparkles className="h-5 w-5" style={{ color: '#05070f' }} />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-brand-cyan">
                  All systems green
                </p>
                <p className="break-all font-mono text-[13px] text-text">
                  {snapshot.live_url.replace(/^https?:\/\//, '')}
                </p>
              </div>
            </div>
            <a
              href={snapshot.live_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] transition-transform hover:-translate-y-px"
              style={{
                color: '#05070f',
                background: 'linear-gradient(90deg, #00e0ff 0%, #2356d6 100%)',
                boxShadow: '0 6px 20px -8px rgba(0,224,255,0.6)',
              }}
            >
              Open LMS <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </motion.div>
      ) : null}

      {/* Failure recovery CTA */}
      {status === 'failed' ? (
        <div className="relative mt-5 flex justify-end">
          <Button
            variant="outline"
            onClick={onRetry}
            isLoading={retrying}
            disabled={retrying}
          >
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry provisioning
          </Button>
        </div>
      ) : null}

      <style>{`
        @keyframes tr-node-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,224,255,0.55), 0 0 16px 0 rgba(0,224,255,0.18); }
          50% { box-shadow: 0 0 0 8px rgba(0,224,255,0), 0 0 22px 4px rgba(0,224,255,0.35); }
        }
        @keyframes tr-ring-expand {
          0% { transform: scale(0.4); opacity: 0.7; }
          100% { transform: scale(1.8); opacity: 0; }
        }
        @keyframes tr-connector-flow {
          0% { background-position: 0% 0; }
          100% { background-position: 0% 200%; }
        }
      `}</style>
    </div>
  );
};

function StatusBadge({
  status,
  liveUrl,
}: {
  status: ProvisioningSnapshot['status'];
  liveUrl?: string;
}) {
  if (status === 'success' && liveUrl) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-brand-cyan/35 bg-brand-cyan/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-cyan">
        <Sparkles className="h-3 w-3" /> Live
      </span>
    );
  }
  if (status === 'in_progress' || status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-brand-cyan/30 bg-brand-cyan/[0.08] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-brand-cyan">
        <Loader2 className="h-3 w-3 animate-spin" /> Running
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-danger-500/35 bg-danger-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-danger-500">
        <AlertCircle className="h-3 w-3" /> Failed
      </span>
    );
  }
  return null;
}

function PipelineRow({
  step,
  isLast,
  connectorActive,
  indexFromActive,
}: {
  step: {
    key: string;
    title: string;
    hint: string;
    index: number;
    state: StepState;
    entry?: ProvisioningSnapshot['log'][number];
  };
  isLast: boolean;
  connectorActive: boolean;
  indexFromActive: number;
}) {
  const isComplete = step.state === 'complete';
  const isActive = step.state === 'active';
  const isFailed = step.state === 'failed';
  const isWarn = step.state === 'warn';
  const isPending = step.state === 'pending';

  return (
    <motion.li
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.45,
        delay: step.index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="relative flex items-start gap-3.5"
    >
      {/* Connector rail (sits behind the node, runs to the next row) */}
      {!isLast ? (
        <span
          aria-hidden
          className="absolute left-[14px] top-7 h-[calc(100%-12px)] w-[2px] rounded-full"
          style={
            connectorActive
              ? {
                  background:
                    'linear-gradient(180deg, rgba(0,224,255,0.7) 0%, rgba(35,86,214,0.7) 100%)',
                  boxShadow: '0 0 8px -1px rgba(0,224,255,0.45)',
                }
              : {
                  background:
                    'repeating-linear-gradient(180deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 4px, transparent 4px, transparent 9px)',
                }
          }
        />
      ) : null}

      {/* Node */}
      <span className="relative z-10 mt-0.5 shrink-0">
        {/* Expanding ring auras around active node */}
        {isActive ? (
          <>
            <span
              aria-hidden
              className="absolute inset-0 m-auto h-7 w-7 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(0,224,255,0.35), transparent 70%)',
                animation: 'tr-ring-expand 1.6s ease-out infinite',
              }}
            />
            <span
              aria-hidden
              className="absolute inset-0 m-auto h-7 w-7 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, rgba(0,224,255,0.25), transparent 70%)',
                animation: 'tr-ring-expand 1.6s ease-out 0.6s infinite',
              }}
            />
          </>
        ) : null}

        <span
          className="relative grid h-7 w-7 place-items-center rounded-full"
          style={
            isComplete
              ? {
                  background:
                    'linear-gradient(135deg, #00e0ff 0%, #2356d6 100%)',
                  boxShadow: '0 0 0 1px rgba(0,224,255,0.45), 0 6px 18px -8px rgba(0,224,255,0.55)',
                }
              : isActive
                ? {
                    background:
                      'linear-gradient(135deg, #00e0ff 0%, #2356d6 100%)',
                    animation: 'tr-node-pulse 1.6s ease-in-out infinite',
                  }
                : isFailed
                  ? {
                      background:
                        'linear-gradient(135deg, #ff5a6a 0%, #b91c1c 100%)',
                      boxShadow: '0 0 0 1px rgba(255,90,106,0.4)',
                    }
                  : isWarn
                    ? {
                        background:
                          'linear-gradient(135deg, #ffd166 0%, #ef8354 100%)',
                        boxShadow: '0 0 0 1px rgba(255,209,102,0.35)',
                      }
                    : {
                        background: 'rgba(255,255,255,0.04)',
                        border: '1.5px dashed rgba(255,255,255,0.18)',
                      }
          }
        >
          {isComplete ? (
            <CheckCircle2 className="h-4 w-4" style={{ color: '#05070f' }} />
          ) : isActive ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" style={{ color: '#05070f' }} />
          ) : isFailed ? (
            <XCircle className="h-4 w-4 text-white" />
          ) : isWarn ? (
            <AlertCircle className="h-3.5 w-3.5" style={{ color: '#05070f' }} />
          ) : (
            <span className="block h-1.5 w-1.5 rounded-full bg-text-mute opacity-60" />
          )}
        </span>
      </span>

      {/* Body */}
      <div className={cn('min-w-0 flex-1 pb-1', isPending && 'opacity-50')}>
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span
            className={cn(
              'text-[14px] font-medium',
              isFailed
                ? 'text-danger-500'
                : isWarn
                  ? 'text-brand-gold'
                  : isPending
                    ? 'text-text-mute'
                    : 'text-text',
            )}
          >
            {step.title}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
            {step.state === 'complete'
              ? indexFromActive === 0
                ? 'done'
                : 'ok'
              : step.state}
          </span>
        </div>
        <p className="mt-0.5 text-[12px] leading-relaxed text-text-dim">
          {step.hint}
        </p>
        {step.entry?.message ? (
          <p className="mt-1 break-all font-mono text-[11px] text-text-mute">
            {step.entry.message}
          </p>
        ) : null}
      </div>
    </motion.li>
  );
}

const TenantRequestDetailsModal: React.FC<Props> = ({
  requestId,
  isOpen,
  onClose,
}) => {
  const { data: detail, isLoading } = useTenantRequest(requestId, {
    pollWhileProvisioning: true,
  });
  const approveMutation = useApproveTenantRequest();
  const rejectMutation = useRejectTenantRequest();
  const retryMutation = useRetryProvisioning();
  const subdomainCheck = useCheckSubdomain();

  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [subdomain, setSubdomain] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [rejectVisible, setRejectVisible] = useState(true);
  const [availability, setAvailability] = useState<Availability>(null);

  useEffect(() => {
    if (!isOpen) {
      setMode('view');
      setSubdomain('');
      setRejectReason('');
      setAvailability(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (detail && !subdomain) {
      // Honour the prospect's requested slug from intake when present, so the
      // super-admin sees their preference pre-filled in the Approve form.
      // Fall back to slugifying the organisation name only if no preference
      // was captured. Admin can still override either way before approval.
      setSubdomain(
        detail.requested_subdomain ||
          slugify(detail.organisation_name)
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.organisation_name, detail?.requested_subdomain]);

  const runCheck = async (value: string) => {
    if (!value) {
      setAvailability(null);
      return;
    }
    try {
      const res = await subdomainCheck.mutateAsync(value);
      setAvailability(
        res.available ? { ok: true } : { ok: false, reason: res.reason || 'Unavailable' }
      );
    } catch {
      setAvailability({ ok: false, reason: 'Could not check availability' });
    }
  };

  /**
   * Backend returns 409 when the request has already moved past `pending_review`
   * (e.g. another tab approved it, or a stale modal still shows the form).
   * Treat it as informational, not an error — refresh the local cache so the
   * UI snaps back to the current truth and the Approve/Reject buttons hide.
   */
  const handleStaleConflict = (id: number, detailMsg?: string) => {
    toast(detailMsg || 'Already actioned — refreshing');
    queryClient.invalidateQueries({ queryKey: ['tenant-request', id] });
    queryClient.invalidateQueries({ queryKey: ['tenant-requests'] });
    setMode('view');
  };

  const onApprove = async () => {
    if (!detail) return;
    try {
      await approveMutation.mutateAsync({
        id: detail.id,
        payload: { subdomain },
      });
      toast.success('Approved · provisioning started');
      setMode('view');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        handleStaleConflict(detail.id, err?.response?.data?.detail);
      } else {
        toast.error(err?.response?.data?.detail || 'Approval failed');
      }
    }
  };

  const onRetry = async () => {
    if (!detail) return;
    try {
      await retryMutation.mutateAsync(detail.id);
      toast.success('Provisioning re-queued');
    } catch (err: any) {
      if (err?.response?.status === 409) {
        handleStaleConflict(detail.id, err?.response?.data?.detail);
      } else {
        toast.error(err?.response?.data?.detail || 'Retry failed');
      }
    }
  };

  const onReject = async () => {
    if (!detail) return;
    if (rejectReason.trim().length < 20) {
      toast.error('Provide at least 20 characters of context');
      return;
    }
    try {
      await rejectMutation.mutateAsync({
        id: detail.id,
        payload: { reason: rejectReason, visible_to_requester: rejectVisible },
      });
      toast.success('Request rejected');
      onClose();
    } catch (err: any) {
      if (err?.response?.status === 409) {
        handleStaleConflict(detail.id, err?.response?.data?.detail);
      } else {
        toast.error(err?.response?.data?.detail || 'Rejection failed');
      }
    }
  };

  const canActOnRequest = detail?.status === 'pending_review';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={detail?.reference_number || 'Tenant request'}
      size="xl"
    >
      {isLoading || !detail ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-cyan" />
        </div>
      ) : (
        <div className="space-y-7">
          {/* Header */}
          <div className="flex items-start gap-4">
            {detail.logo_url ? (
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-themed bg-white/95 p-1.5">
                <img
                  src={detail.logo_url}
                  alt={detail.organisation_name}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-grad shadow-glow">
                <span className="font-mono text-[18px] font-bold text-white">
                  {detail.organisation_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="serif-display text-[22px] leading-tight text-text">
                  {detail.organisation_name}
                </h3>
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2',
                    STATUS_TONE[detail.status]
                  )}
                >
                  {STATUS_LABELS[detail.status]}
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-text-dim">
                {detail.description}
              </p>
            </div>
          </div>

          {/* Field grid */}
          <dl className="grid grid-cols-2 gap-x-8 gap-y-5 border-t border-themed pt-6">
            <Field label="Type">
              {ORG_TYPE_LABELS[detail.organisation_type] || detail.organisation_type}
            </Field>
            <Field label="Country">{detail.country}</Field>
            <Field label="Contact">{detail.contact_name}</Field>
            <Field label="Email">
              <span className="break-all">{detail.contact_email}</span>
            </Field>
            <Field label="Expected learners">
              {LEARNER_BAND_LABELS[detail.expected_learner_band] ||
                detail.expected_learner_band}
            </Field>
            <Field label="Submitted">
              {new Date(detail.created_at).toLocaleString()}
            </Field>
            {detail.reviewed_at ? (
              <Field label="Reviewed">
                {new Date(detail.reviewed_at).toLocaleString()}
                {detail.reviewed_by_email ? ` · ${detail.reviewed_by_email}` : ''}
              </Field>
            ) : null}
            {detail.approved_subdomain ? (
              <Field label="Subdomain">
                <span className="font-mono text-brand-cyan">
                  {detail.approved_subdomain}.ailinc.com
                </span>
              </Field>
            ) : null}
            {/* The slug the prospect chose at intake. Shown ONLY when they
                actually picked one (the field is optional) AND only when the
                request isn't yet approved — once `approved_subdomain` is set,
                that's the source of truth and surfacing both would just clutter
                the panel. */}
            {detail.requested_subdomain && !detail.approved_subdomain ? (
              <Field label="Requested slug">
                <span className="font-mono text-text-dim">
                  {detail.requested_subdomain}.ailinc.com
                </span>
              </Field>
            ) : null}
          </dl>

          {detail.provisioning ? (
            <ProvisioningPanel
              snapshot={detail.provisioning}
              onRetry={onRetry}
              retrying={retryMutation.isLoading}
            />
          ) : null}

          {detail.wizard_progress ? (
            <WizardProgressPanel
              progress={detail.wizard_progress}
              subdomain={detail.approved_subdomain}
            />
          ) : null}

          {detail.rejection_reason ? (
            <div className="rounded-lg border border-danger-500/30 bg-danger-500/[0.06] p-4">
              <div className="mb-1.5 flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-danger-500">
                <ShieldAlert className="h-3 w-3" /> Reviewer note
              </div>
              <p className="text-[13px] leading-relaxed text-text">
                {detail.rejection_reason}
              </p>
              {!detail.rejection_visible_to_requester && (
                <p className="mt-2 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                  Internal-only · not shown to requester
                </p>
              )}
            </div>
          ) : null}

          {/* Mode bars */}
          {mode === 'view' && canActOnRequest && (
            <div className="flex flex-wrap justify-end gap-3 border-t border-themed pt-5">
              <Button variant="danger" onClick={() => setMode('reject')}>
                <XCircle className="mr-1.5 h-4 w-4" /> Reject
              </Button>
              <Button onClick={() => setMode('approve')}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
              </Button>
            </div>
          )}

          {mode === 'approve' && (
            <div className="space-y-5 border-t border-themed pt-5">
              <h4 className="font-mono text-[11px] font-semibold uppercase tracking-widest2 text-brand-cyan">
                Provision this tenant
              </h4>
              <div>
                <label className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-widest2 text-text-dim">
                  Subdomain
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      value={subdomain}
                      onChange={(e) => {
                        setSubdomain(slugify(e.target.value));
                        setAvailability(null);
                      }}
                      onBlur={(e) => runCheck(e.target.value)}
                      placeholder="acme"
                    />
                  </div>
                  <span className="whitespace-nowrap font-mono text-[13px] text-text-dim">
                    .ailinc.com
                  </span>
                </div>
                <AvailabilityIndicator
                  loading={subdomainCheck.isLoading}
                  value={availability}
                />
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-brand-cyan/20 bg-brand-cyan/[0.04] p-3">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-cyan" />
                <p className="text-[12px] leading-relaxed text-text-dim">
                  Approving creates the tenant atomically and kicks off automated
                  whitelabel provisioning for{' '}
                  <code className="rounded bg-line/[0.05] px-1 py-0.5 font-mono text-text">
                    {subdomain || 'subdomain'}.ailinc.com
                  </code>{' '}
                  — Netlify site, subdomain alias, and build trigger. Live status
                  appears below once it starts. The requester receives two emails:
                  a &ldquo;request approved&rdquo; email now (with their URL and
                  sign-in instructions), and a &ldquo;your LMS is live&rdquo; email
                  once they finish the 8-step setup wizard.
                </p>
              </div>

              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={() => setMode('view')}>
                  Cancel
                </Button>
                <Button
                  onClick={onApprove}
                  isLoading={approveMutation.isLoading}
                  disabled={
                    !subdomain ||
                    (availability !== null && !availability.ok) ||
                    approveMutation.isLoading
                  }
                >
                  Approve & provision
                </Button>
              </div>
            </div>
          )}

          {mode === 'reject' && (
            <div className="space-y-5 border-t border-themed pt-5">
              <h4 className="font-mono text-[11px] font-semibold uppercase tracking-widest2 text-danger-500">
                Reject this request
              </h4>
              <div>
                <label className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-widest2 text-text-dim">
                  Reason (min 20 chars)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-themed-2 bg-ink-1/60 px-3 py-2.5 text-[14px] text-text placeholder:text-text-mute
                    transition-colors duration-200 focus:outline-none focus:border-danger-500/50 focus:bg-ink-1/90
                    focus:shadow-[0_0_0_3px_rgba(255,90,106,0.15)]"
                  placeholder="Help the requester understand why — or note internal context only."
                />
                <p className="mt-1.5 font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                  {rejectReason.length}/2000
                </p>
              </div>
              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-text-dim">
                <input
                  type="checkbox"
                  checked={rejectVisible}
                  onChange={(e) => setRejectVisible(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-cyan"
                />
                <span>Show reason to requester in their email</span>
              </label>
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="outline" onClick={() => setMode('view')}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={onReject}
                  isLoading={rejectMutation.isLoading}
                  disabled={rejectReason.trim().length < 20 || rejectMutation.isLoading}
                >
                  Confirm reject
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
};

export default TenantRequestDetailsModal;
