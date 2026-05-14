import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Info,
  ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { cn } from '../../utils/helpers';
import {
  ORG_TYPE_LABELS,
  LEARNER_BAND_LABELS,
  STATUS_LABELS,
  STATUS_TONE,
} from '../../types/tenantRequest';
import {
  useApproveTenantRequest,
  useCheckSubdomain,
  useRejectTenantRequest,
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

const TenantRequestDetailsModal: React.FC<Props> = ({
  requestId,
  isOpen,
  onClose,
}) => {
  const { data: detail, isLoading } = useTenantRequest(requestId);
  const approveMutation = useApproveTenantRequest();
  const rejectMutation = useRejectTenantRequest();
  const subdomainCheck = useCheckSubdomain();

  const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');
  const [subdomain, setSubdomain] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
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
      setSubdomain(slugify(detail.organisation_name));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail?.organisation_name]);

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

  const onApprove = async () => {
    if (!detail) return;
    try {
      await approveMutation.mutateAsync({
        id: detail.id,
        payload: { subdomain, send_credentials_email: sendEmail },
      });
      toast.success('Request approved · tenant provisioned');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Approval failed');
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
      toast.error(err?.response?.data?.detail || 'Rejection failed');
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
          </dl>

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

              <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-text-dim">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="mt-0.5 h-4 w-4 cursor-pointer accent-brand-cyan"
                />
                <span>Email the requester their LMS URL and sign-in instructions</span>
              </label>

              <div className="flex items-start gap-2.5 rounded-lg border border-brand-cyan/20 bg-brand-cyan/[0.04] p-3">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-cyan" />
                <p className="text-[12px] leading-relaxed text-text-dim">
                  This atomically creates a Client + first Admin user. After approval,
                  configure DNS for{' '}
                  <code className="rounded bg-line/[0.05] px-1 py-0.5 font-mono text-text">
                    {subdomain || 'subdomain'}.ailinc.com
                  </code>{' '}
                  manually.
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
