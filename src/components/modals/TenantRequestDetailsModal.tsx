import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import {
  TenantRequestDetail,
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

type Availability = { ok: true } | { ok: false; reason: string } | null;

const renderAvailability = (loading: boolean, availability: Availability) => {
  if (loading) {
    return (
      <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking…
      </p>
    );
  }
  if (!availability) return null;
  if (availability.ok) {
    return (
      <p className="mt-1 text-xs text-secondary-700 flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Available
      </p>
    );
  }
  const reason = (availability as { ok: false; reason: string }).reason;
  return (
    <p className="mt-1 text-xs text-danger-700 flex items-center gap-1">
      <AlertCircle className="h-3 w-3" /> {reason}
    </p>
  );
};

const slugify = (raw: string) =>
  raw
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);

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
          <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-start gap-4">
            {detail.logo_url ? (
              <img
                src={detail.logo_url}
                alt={detail.organisation_name}
                className="h-16 w-16 rounded-lg border border-gray-200 object-contain bg-white p-1"
              />
            ) : null}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-gray-900">
                  {detail.organisation_name}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_TONE[detail.status]}`}
                >
                  {STATUS_LABELS[detail.status]}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">{detail.description}</p>
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-gray-500">Type</dt>
              <dd className="text-gray-900">
                {ORG_TYPE_LABELS[detail.organisation_type] || detail.organisation_type}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Country</dt>
              <dd className="text-gray-900">{detail.country}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Contact</dt>
              <dd className="text-gray-900">{detail.contact_name}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Work email</dt>
              <dd className="text-gray-900">{detail.contact_email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Expected learners</dt>
              <dd className="text-gray-900">
                {LEARNER_BAND_LABELS[detail.expected_learner_band] ||
                  detail.expected_learner_band}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Submitted</dt>
              <dd className="text-gray-900">
                {new Date(detail.created_at).toLocaleString()}
              </dd>
            </div>
            {detail.reviewed_at ? (
              <div>
                <dt className="text-gray-500">Reviewed</dt>
                <dd className="text-gray-900">
                  {new Date(detail.reviewed_at).toLocaleString()}
                  {detail.reviewed_by_email
                    ? ` · ${detail.reviewed_by_email}`
                    : ''}
                </dd>
              </div>
            ) : null}
            {detail.approved_subdomain ? (
              <div>
                <dt className="text-gray-500">Subdomain</dt>
                <dd className="text-primary-700 font-mono">
                  {detail.approved_subdomain}.ailinc.com
                </dd>
              </div>
            ) : null}
          </dl>

          {detail.rejection_reason ? (
            <div className="rounded-lg bg-danger-50 border border-danger-200 p-3 text-sm text-danger-700">
              <p className="font-medium mb-1">Reviewer note</p>
              <p>{detail.rejection_reason}</p>
              {!detail.rejection_visible_to_requester && (
                <p className="mt-2 text-xs text-danger-600">
                  Internal-only — not shown to requester
                </p>
              )}
            </div>
          ) : null}

          {mode === 'view' && canActOnRequest && (
            <div className="flex justify-end gap-3 border-t pt-4">
              <Button variant="danger" onClick={() => setMode('reject')}>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </Button>
              <Button onClick={() => setMode('approve')}>
                <CheckCircle2 className="h-4 w-4 mr-1" /> Approve
              </Button>
            </div>
          )}

          {mode === 'approve' && (
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-gray-900">Provision this tenant</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subdomain
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    value={subdomain}
                    onChange={(e) => {
                      setSubdomain(slugify(e.target.value));
                      setAvailability(null);
                    }}
                    onBlur={(e) => runCheck(e.target.value)}
                    placeholder="acme"
                  />
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    .ailinc.com
                  </span>
                </div>
                {renderAvailability(subdomainCheck.isLoading, availability)}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                Email the requester their LMS URL and sign-in instructions
              </label>
              <div className="rounded-lg bg-gray-50 border border-gray-200 p-3 text-xs text-gray-600 flex items-start gap-2">
                <ExternalLink className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <p>
                  This atomically creates a Client + first Admin user. After
                  approval, configure DNS for <code>{subdomain || 'subdomain'}.ailinc.com</code> manually.
                </p>
              </div>
              <div className="flex justify-end gap-3">
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
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-gray-900">Reject this request</h4>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason (min 20 chars)
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                  placeholder="Help the requester understand why — or note internal context only."
                />
                <p className="mt-1 text-xs text-gray-500">
                  {rejectReason.length}/2000
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={rejectVisible}
                  onChange={(e) => setRejectVisible(e.target.checked)}
                />
                Show reason to requester in their email
              </label>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setMode('view')}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={onReject}
                  isLoading={rejectMutation.isLoading}
                  disabled={
                    rejectReason.trim().length < 20 || rejectMutation.isLoading
                  }
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
