import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Ban, Check, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import Button from './Button';
import type { Client } from '../../types/client';
import type { PurgeManifest, PurgeStepEntry } from '../../types/clientPurge';
import {
  isTerminalPurgeStatus,
  usePurgeClient,
  usePurgePreview,
  usePurgeStatus,
} from '../../hooks/useClientPurge';
import { formatBytes } from '../files/formatBytes';
import { cn, formatNumber } from '../../utils/helpers';

interface Props {
  /** null while nothing is selected. The modal owns no copy of the tenant: everything destructive
   *  is keyed off the id and the name that came back with the manifest. */
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
  /** Called once the worker reports the purge finished, so the parent can drop the row. */
  onPurged: () => void;
}

/** The eight ordered steps of superadmin_portal/purge/tasks.py, in the order the worker runs them.
 *  The task also writes bookkeeping entries outside this list (`orphan_candidates`, `dry_run`,
 *  `refused`, `resolve_client`, `error`); those are not checklist items and are surfaced
 *  separately, because rendering "orphan_candidates" as a step nobody planned reads as a bug. */
const PURGE_STEPS: Array<{ step: string; label: string }> = [
  { step: 'archive', label: 'Archive the plan and export the tenant' },
  { step: 'revoke_credentials', label: 'Revoke Zoom / Google grants, delete credentials' },
  { step: 'netlify', label: 'Delete the Netlify site' },
  { step: 's3', label: 'Delete the S3 prefixes' },
  { step: 'redis', label: 'Flush cached leaderboards and tokens' },
  { step: 'db', label: 'Delete the database rows' },
  { step: 'orphan_users', label: 'Delete accounts the cascade could not reach' },
  { step: 'complete', label: 'Finish and stamp the audit row' },
];

/**
 * Pull the sentence the backend actually wrote.
 *
 * DRF answers these endpoints with `error`, while api.ts's toast handler reads `message` and so
 * falls back to "Bad request" for every one of them. On this screen that is the difference between
 * "Purge refused: 2 blocking check(s)" and a generic failure with no instruction in it, so the
 * modal reads the payload itself rather than leaving the operator with the toast.
 */
/** The machine-readable half of the same payload: `confirmation_required`, `name_mismatch`,
 *  `purge_refused`, `stale_manifest`. Drives what the modal offers to do next. */
const backendCode = (error: unknown): string =>
  String((error as { response?: { data?: any } })?.response?.data?.code || '');

const backendMessage = (error: unknown, fallback: string): string => {
  const data = (error as { response?: { data?: any } })?.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data?.error) return String(data.error);
  if (data?.message) return String(data.message);
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const ClientPurgeModal: React.FC<Props> = ({ client, isOpen, onClose, onPurged }) => {
  const [confirmText, setConfirmText] = useState('');
  const [purgeId, setPurgeId] = useState<number | null>(null);

  const clientId = client?.id ?? 0;
  const preview = usePurgePreview(clientId, { enabled: isOpen && clientId > 0 });
  const purgeMutation = usePurgeClient(clientId);
  const status = usePurgeStatus(purgeId);

  useEffect(() => {
    // Reset on open, not on close. Clearing on close would wipe the purge id out from under the
    // closing animation, and the id is the only handle on a job that is still running.
    if (isOpen) {
      setConfirmText('');
      setPurgeId(null);
      purgeMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, clientId]);

  const announced = useRef(false);
  const runStatus = status.data?.status;
  useEffect(() => {
    if (runStatus !== 'completed' || announced.current) return;
    announced.current = true;
    toast.success(`'${status.data?.client_name}' is gone. Purge #${status.data?.purge_id}.`);
    onPurged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runStatus]);
  useEffect(() => {
    if (isOpen) announced.current = false;
  }, [isOpen]);

  const manifest: PurgeManifest | undefined = preview.data;
  const blocking = manifest?.blocking ?? [];
  const queued = purgeId !== null;
  // Non-dismissable from here until the worker stops, same rule as FileDeletionModal: a purge that
  // is halfway through five external systems is not something to lose the only progress view of.
  const busy = purgeMutation.isLoading || (queued && !isTerminalPurgeStatus(runStatus));

  const s3 = useMemo(() => {
    const prefixes = manifest?.external.s3_prefixes ?? [];
    // A prefix that could not be sized contributes nothing to the total AND makes the total a
    // lower bound, which the panel then has to say out loud rather than printing a confident
    // number that is short by a bucket.
    const unsized = prefixes.filter((p) => p.object_count === null).length;
    return {
      objects: prefixes.reduce((acc, p) => acc + (p.object_count || 0), 0),
      bytes: prefixes.reduce((acc, p) => acc + (p.total_size_bytes || 0), 0),
      prefixes,
      unsized,
    };
  }, [manifest]);

  const topModels = useMemo(() => {
    const byModel = manifest?.counts.by_model ?? {};
    return Object.entries(byModel)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [manifest]);

  const doneSteps = useMemo(() => {
    const log: PurgeStepEntry[] = status.data?.step_log ?? [];
    return new Set(log.filter((e) => e.status === 'done').map((e) => e.step));
  }, [status.data]);

  const failedEntry = (status.data?.step_log ?? []).find((e) => e.status === 'failed');
  // A refusal is written as a 'done' entry under its own step name, so it is not a failure in the
  // ledger and would otherwise render as a job that quietly stopped one step in.
  const refusedEntry = (status.data?.step_log ?? []).find((e) => e.step === 'refused');

  const nameMatches = !!client && confirmText.trim() === client.name;
  const canPurge =
    !!manifest && blocking.length === 0 && nameMatches && !busy && !queued;

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  const handlePurge = async () => {
    if (!client || !manifest) return;
    try {
      const res = await purgeMutation.mutateAsync({
        confirm_name: confirmText.trim(),
        manifest_hash: manifest.manifest_hash,
      });
      setPurgeId(res.purge_id);
    } catch (error) {
      // No toast.success anywhere near this path. The mutation rejects on a refusal (400), a stale
      // manifest (409) and a lost session (401) alike, and the operator has to be able to tell a
      // queued purge from a rejected one.
      toast.error(backendMessage(error, 'The purge request failed. Nothing was deleted.'));
    }
  };

  const integrations = manifest?.external.integrations;

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => undefined : handleClose}
      size="lg"
      showCloseButton={!busy}
      title={client ? `Purge '${client.name}'?` : 'Purge institution?'}
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-danger-500/30 bg-danger-500/[0.06] p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger-500" />
            <div>
              <p className="text-[13px] font-semibold text-text">
                This deletes the institution. There is no undo and no restore path.
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
                Learners and their accounts, courses, submissions, uploaded files, the Netlify
                site and the Zoom or Google grants held on the customer's own account all go. This
                portal cannot bring any of it back, and nothing behind it keeps a soft-deleted
                copy. If the institution only needs to stop working, switch it inactive instead:
                that locks every request out and keeps the data.
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-text-dim">
                The slug{' '}
                <span className="font-mono text-[11px] text-text">
                  {client?.slug || manifest?.client.slug || 'unknown'}
                </span>{' '}
                is freed and a new institution can take it, subdomain included. The numeric id{' '}
                <span className="font-mono text-[11px] text-text">{clientId}</span> is not reused:
                a rebuilt tenant gets a new one, so anything keyed by the old id stays orphaned.
              </p>
            </div>
          </div>
        </div>

        {/* Plan */}
        {preview.isLoading ? (
          <div className="flex items-center gap-3 rounded-xl border border-themed bg-line/[0.02] p-4 text-[13px] text-text-dim">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
            Planning the purge. Counting rows, sizing the bucket and resolving the Netlify site.
          </div>
        ) : preview.error ? (
          <div className="rounded-xl border border-danger-500/30 bg-danger-500/[0.06] p-4">
            <p className="text-[13px] font-semibold text-text">
              The plan could not be built, so there is nothing to confirm.
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
              {backendMessage(preview.error, 'The preview request failed.')}
            </p>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => preview.refetch()}
                disabled={preview.isFetching}
              >
                Try again
              </Button>
            </div>
          </div>
        ) : manifest ? (
          <div className="rounded-xl border border-themed bg-line/[0.02] p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
              Impact
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat
                label="Database rows"
                value={
                  manifest.counts.skipped
                    ? 'Not counted'
                    : formatNumber(manifest.counts.total_rows || 0)
                }
              />
              <Stat
                label="Models"
                value={String(manifest.counts.models_in_closure ?? 0)}
              />
              <Stat
                label="S3 objects"
                value={
                  s3.prefixes.length === 0
                    ? '0'
                    : s3.unsized === s3.prefixes.length
                    ? 'Not counted'
                    : formatNumber(s3.objects)
                }
              />
              <Stat
                label="S3 size"
                value={s3.unsized === s3.prefixes.length ? 'Not sized' : formatBytes(s3.bytes)}
              />
            </div>

            {manifest.deep === false ? (
              <p className="mt-3 text-[12px] leading-relaxed text-text-mute">
                Shallow plan: the deep one did not answer inside the request timeout, so the row
                counts, the object sizing and the Netlify lookup were skipped. The confirmation
                hash is identical either way, and the purge itself still deletes all of it.
              </p>
            ) : null}
            {s3.unsized > 0 && s3.unsized < s3.prefixes.length ? (
              <p className="mt-3 text-[12px] leading-relaxed text-text-mute">
                {s3.unsized} of {s3.prefixes.length} S3 prefixes could not be sized, so the two
                numbers above are a lower bound. Those prefixes are deleted regardless.
              </p>
            ) : null}
            {Object.keys(manifest.counts.count_errors || {}).length > 0 ? (
              <p className="mt-3 text-[12px] leading-relaxed text-text-mute">
                {Object.keys(manifest.counts.count_errors || {}).length} model(s) could not be
                counted. Their rows are still inside the cascade.
              </p>
            ) : null}

            {topModels.length > 0 ? (
              <ul className="mt-4 space-y-1.5 text-[12px] text-text-dim">
                {topModels.map(([label, count]) => (
                  <li key={label} className="flex items-center justify-between gap-3">
                    <span className="truncate font-mono text-[11px]" title={label}>
                      {label}
                    </span>
                    <span className="shrink-0 text-text-mute">{formatNumber(count)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 space-y-1.5 border-t border-themed pt-3 text-[12px] text-text-dim">
              <Line label="Netlify site">
                {manifest.external.netlify.error
                  ? `Lookup failed: ${manifest.external.netlify.error}`
                  : manifest.external.netlify.resolved_site_id
                  ? `${
                      manifest.external.netlify.resolved_site_url ||
                      manifest.external.netlify.resolved_site_id
                    } (found by ${manifest.external.netlify.resolved_from})`
                  : 'None on record. Nothing will be deleted at Netlify.'}
              </Line>
              <Line label="S3 prefixes">
                {s3.prefixes.length > 0
                  ? s3.prefixes.map((p) => p.prefix).join(', ')
                  : 'None'}
              </Line>
              <Line label="Credentials">
                {integrations ? describeIntegrations(manifest) : 'None'}
              </Line>
              <Line label="Redis keys">
                {formatNumber(manifest.external.redis_keys.length)} cached key(s) flushed before the
                rows go, while the course ids still exist to build them from.
              </Line>
              <Line label="Manifest">
                <span className="font-mono text-[11px]">
                  {manifest.manifest_hash.slice(0, 16)}
                </span>{' '}
                planned {new Date(manifest.generated_at).toLocaleString()}
              </Line>
            </div>
          </div>
        ) : null}

        {/* Refusals. No override, by design: each one is damage to a tenant nobody asked to delete. */}
        {blocking.length > 0 ? (
          <div className="rounded-xl border border-danger-500/30 bg-danger-500/[0.06] p-4">
            <div className="flex items-start gap-3">
              <Ban className="mt-0.5 h-5 w-5 shrink-0 text-danger-500" />
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-text">
                  Refused: {blocking.length} blocking check
                  {blocking.length === 1 ? '' : 's'}. This purge cannot be confirmed.
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
                  Every one of these describes damage landing on a tenant that is not being
                  deleted, so there is no override. Fix them and preview again.
                </p>
                <ul className="mt-3 space-y-2">
                  {blocking.map((b) => (
                    <li key={b.code} className="rounded-lg border border-themed bg-line/[0.02] p-3">
                      <p className="font-mono text-[10px] uppercase tracking-widest2 text-danger-500">
                        {b.code}
                      </p>
                      <p className="mt-1 text-[12px] leading-relaxed text-text-dim">{b.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : null}

        {/* A rejected request, spelled out where the operator is looking. The toast says the same
            thing and then disappears; this is the half that has to still be on screen while they
            work out what changed. */}
        {purgeMutation.error && !queued ? (
          <div className="rounded-xl border border-danger-500/30 bg-danger-500/[0.06] p-4">
            <p className="text-[13px] font-semibold text-text">
              Not queued. Nothing was deleted.
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
              {backendMessage(purgeMutation.error, 'The purge request failed.')}
            </p>
            {backendCode(purgeMutation.error) === 'stale_manifest' ? (
              <div className="mt-3">
                {/* The plan moved between reading it and confirming it, which is the one case the
                    operator can clear themselves: re-plan, read what changed, confirm again. */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setConfirmText('');
                    purgeMutation.reset();
                    preview.refetch();
                  }}
                  disabled={preview.isFetching}
                >
                  Preview again
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Progress, once the job is queued. */}
        {queued ? (
          <div className="rounded-xl border border-themed bg-line/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                Purge #{purgeId}
              </p>
              <span className="font-mono text-[10px] uppercase tracking-widest2 text-text-dim">
                {runStatus || 'queued'}
              </span>
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-text-dim">
              The worker runs this outside the request, so this window is locked until it stops.
              Purge #{purgeId} keeps answering afterwards, which is deliberate: its status is read
              by id, not through the client row that no longer exists.
            </p>
            <ul className="mt-4 space-y-2">
              {PURGE_STEPS.map(({ step, label }, i) => {
                const done = doneSteps.has(step);
                // The first unfinished step is the one in flight, but only while the worker is
                // actually moving. On a failed run nothing is in flight and a spinner there would
                // claim work that stopped minutes ago.
                const current =
                  !done &&
                  runStatus === 'running' &&
                  PURGE_STEPS.slice(0, i).every((s) => doneSteps.has(s.step));
                return (
                  <li key={step} className="flex items-center gap-3 text-[12px]">
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                        done
                          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
                          : current
                          ? 'border-brand-cyan/40 bg-brand-cyan/10'
                          : 'border-themed-2'
                      )}
                    >
                      {done ? <Check className="h-2.5 w-2.5" /> : null}
                      {current ? (
                        <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-cyan" />
                      ) : null}
                    </span>
                    <span className={done ? 'text-text-dim' : 'text-text-mute'}>{label}</span>
                  </li>
                );
              })}
            </ul>
            {refusedEntry ? (
              <div className="mt-4 rounded-lg border border-danger-500/30 bg-danger-500/[0.06] p-3">
                <p className="text-[12px] font-semibold text-text">
                  Refused at execute time. Nothing was deleted.
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
                  {String(refusedEntry.detail?.reason || 'No reason was recorded.')} The worker
                  re-runs the checks against the tenant as it is now, not as it was when the plan
                  was read, so something changed in between.
                </p>
              </div>
            ) : null}
            {failedEntry ? (
              <div className="mt-4 rounded-lg border border-danger-500/30 bg-danger-500/[0.06] p-3">
                <p className="text-[12px] font-semibold text-text">
                  Stopped at {failedEntry.step}. Assume the tenant is half deleted.
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
                  {String(failedEntry.detail?.error || 'No detail was recorded.')} This portal
                  cannot restart purge #{purgeId}: re-enqueuing it from the worker picks up at the
                  last finished step above, which is the only path that will not redo the finished
                  ones. Write the purge id down before you close this.
                </p>
              </div>
            ) : null}
            {status.error ? (
              <p className="mt-3 text-[12px] leading-relaxed text-danger-500">
                {backendMessage(
                  status.error,
                  'Could not read the purge status. The job itself is unaffected.'
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Type-to-confirm. Hidden entirely when blocked: there is nothing a typed name can unlock. */}
        {!queued && manifest && blocking.length === 0 ? (
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
              Type{' '}
              <span className="font-bold text-danger-500">{client?.name}</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="mt-2 w-full rounded-lg border border-themed-2 bg-ink-1/40 px-3 py-2
                font-mono text-[13px] text-text outline-none
                focus:border-danger-500/60 focus:ring-2 focus:ring-danger-500/30"
              placeholder={client?.name}
              autoFocus
            />
            <p className="mt-2 text-[11px] leading-relaxed text-text-mute">
              Exact match, spelling and case included. The backend checks the name before it looks
              at the tenant at all, so a typo means the wrong institution may be selected.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3 border-t border-themed pt-5">
          <Button variant="ghost" onClick={handleClose} disabled={busy}>
            {queued && isTerminalPurgeStatus(runStatus) ? 'Close' : 'Cancel'}
          </Button>
          {!queued ? (
            <Button
              variant="danger"
              isLoading={purgeMutation.isLoading}
              disabled={!canPurge}
              leftIcon={<Trash2 className="h-3.5 w-3.5" />}
              onClick={handlePurge}
            >
              Purge permanently
            </Button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
};

/** One-line summary of what is held on the customer's own third-party accounts. Grants that need
 *  revoking are named first: deleting the row without revoking leaves this application authorised
 *  on their Zoom or Google account forever, with nothing left to revoke it with. */
const describeIntegrations = (manifest: PurgeManifest): string => {
  const i = manifest.external.integrations;
  const parts: string[] = [];
  if (i.zoom.needs_revoke) parts.push(`Zoom OAuth grant (${i.zoom.connected_email || 'no email'})`);
  else if (i.zoom.present) parts.push(`Zoom (${i.zoom.connection_mode || 'configured'})`);
  if (i.google.needs_revoke)
    parts.push(`Google OAuth grant (${i.google.connected_email || 'no email'})`);
  else if (i.google.present) parts.push('Google');
  if (i.razorpay.present) parts.push(`Razorpay (${i.razorpay.key_id || 'no key id'})`);
  if (i.api_credentials > 0) parts.push(`${i.api_credentials} partner API credential(s)`);
  if (i.tenant_integration.present) parts.push('Partner callback integration');
  return parts.length > 0 ? parts.join(', ') : 'None on record';
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">{label}</p>
    <p className="mt-1 text-[18px] font-semibold text-text">{value}</p>
  </div>
);

const Line: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
    <span className="shrink-0 font-mono text-[10px] uppercase tracking-widest2 text-text-mute sm:w-32 sm:pt-0.5">
      {label}
    </span>
    <span className="min-w-0 break-words">{children}</span>
  </div>
);

export default ClientPurgeModal;
