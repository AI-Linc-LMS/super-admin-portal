import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Ban, Check, Trash2, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from './Modal';
import Button from './Button';
import type { Client } from '../../types/client';
import type {
  PurgeBlocker,
  PurgeManifest,
  PurgeStepEntry,
  RepairEdge,
  RepairPlan,
  RepairRefusalReason,
  RepairRow,
} from '../../types/clientPurge';
import {
  isRepairableBlocker,
  isTerminalPurgeStatus,
  repairEdgeKey,
  usePurgeClient,
  usePurgePreview,
  usePurgeStatus,
  useRepairCrossTenant,
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

/** Stable per-blocker identity. `code` is NOT unique: cross_tenant_cascade emits one entry per
 *  boundary edge under a single code, which is exactly why the backend added `key` and hashes on
 *  it instead. Anything that addresses one blocker (a React key, the repair target) uses this. */
const blockerKey = (b: PurgeBlocker): string => b.key || b.code;

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
  /** The repair document currently on screen: a dry-run plan awaiting a decision when
   *  `executed` is false, the receipt of what was written when it is true. Null means the operator
   *  has not asked for a plan yet. Held here rather than read off the mutation so that re-running
   *  the purge preview after an execute cannot drop the receipt the operator is still reading. */
  const [repairPlan, setRepairPlan] = useState<RepairPlan | null>(null);
  /** The typed name authorising the REPAIR, kept separate from `confirmText` above. Two boxes and
   *  not one, because the purge confirm input is hidden while anything blocks (there is nothing a
   *  typed name can unlock there) and this gate is only ever needed while something does. Sharing
   *  one field would also mean a name typed for the repair silently authorising the purge. */
  const [repairConfirmText, setRepairConfirmText] = useState('');

  const clientId = client?.id ?? 0;
  const preview = usePurgePreview(clientId, { enabled: isOpen && clientId > 0 });
  const purgeMutation = usePurgeClient(clientId);
  const repairMutation = useRepairCrossTenant(clientId);
  const status = usePurgeStatus(purgeId);

  useEffect(() => {
    // Reset on open, not on close. Clearing on close would wipe the purge id out from under the
    // closing animation, and the id is the only handle on a job that is still running.
    if (isOpen) {
      setConfirmText('');
      setPurgeId(null);
      setRepairPlan(null);
      setRepairConfirmText('');
      purgeMutation.reset();
      repairMutation.reset();
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

  /** Blockers the repair endpoint actually covers, per the backend's own `detail.repairable`. The
   *  rest (a platform tenant, the Verified Library, roadmap bindings, and crossings on a shared
   *  catalog row rather than a profile) have no automated fix, and offering one would be a lie. */
  const repairableBlockers = useMemo(() => blocking.filter(isRepairableBlocker), [blocking]);

  /** The plan's edges keyed by the blocker they answer, so each blocker shows only its own rows.
   *  The plan reports the edges it found something on, which is neither the same set nor the same
   *  order as the blocker list, so this is a join and never a zip. */
  const repairEdgesByKey = useMemo(() => {
    const map = new Map<string, RepairEdge>();
    (repairPlan?.edges ?? []).forEach((e) => map.set(repairEdgeKey(e), e));
    return map;
  }, [repairPlan]);

  const nameMatches = !!client && confirmText.trim() === client.name;
  const canPurge =
    !!manifest && blocking.length === 0 && nameMatches && !busy && !queued;

  // A plan that has not been applied yet and has something to apply. `rehomable` and not
  // `rows_found`: a plan where every row is refused is a real answer, and an Apply button on it
  // would write nothing while implying otherwise.
  const pendingRepair =
    repairPlan && !repairPlan.executed && repairPlan.totals.rehomable > 0 ? repairPlan : null;
  // The repair's own typed-name gate, checked here as well as on the backend so the button reads
  // as unavailable rather than failing with a 400. The backend check is the real one.
  const repairNameMatches = !!client && repairConfirmText.trim() === client.name;

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

  /** Step one. Reads rows and writes nothing, which is what makes it safe to offer as a plain
   *  button: the operator is asking "what would this do", not authorising anything. */
  const handlePlanRepair = async () => {
    try {
      setRepairPlan(await repairMutation.mutateAsync({ execute: false }));
    } catch (error) {
      toast.error(backendMessage(error, 'The repair could not be planned. Nothing was changed.'));
    }
  };

  /** Step two, reachable only once a plan is on screen. Writes to rows owned by OTHER live
   *  tenants, so the preview is re-run straight afterwards rather than the modal asserting that
   *  the blocker cleared: the receipt says what was written, and the new preview says whether the
   *  purge is actually possible now. Those are different questions and only the backend answers
   *  the second one. */
  const handleApplyRepair = async () => {
    if (!pendingRepair || !client || !repairNameMatches) return;
    try {
      const receipt = await repairMutation.mutateAsync({
        execute: true,
        // The name the operator typed, not `client.name`. Sending the latter would satisfy the
        // backend's gate from the UI's own knowledge, which is not a confirmation, it is a bypass.
        confirm_name: repairConfirmText.trim(),
      });
      setRepairPlan(receipt);
      // Deliberately not conditional on the receipt looking clean. Re-previewing is how the
      // operator finds out what is left, including blockers this repair never covered, and it is
      // also how they find out at all: the endpoint no longer re-runs the blocker sweep itself,
      // because that sweep would have run after the writes committed and a timeout in it would
      // report a failure for a request that had already moved rows.
      await preview.refetch();
      // Both typed names cleared. The purge one was for the plan that existed before rows moved,
      // and the repair one has been spent.
      setConfirmText('');
      setRepairConfirmText('');
      toast.success(
        `Re-homed ${receipt.totals.rehomed} row(s). The purge plan below has been re-run.`
      );
    } catch (error) {
      toast.error(backendMessage(error, 'The repair failed. Nothing was changed.'));
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

        {/* Refusals. No override, by design: each one is damage to a tenant nobody asked to
            delete. Some of them do have a fix, and it lives in here rather than in a region of its
            own, because it is only ever meaningful as an answer to one of these lines.

            Rendered while there is a repair document even after `blocking` empties, so the receipt
            for a repair that cleared the last blocker does not vanish at the moment it is read. */}
        {blocking.length > 0 || repairPlan ? (
          <div
            className={cn(
              'rounded-xl border p-4',
              blocking.length > 0
                ? 'border-danger-500/30 bg-danger-500/[0.06]'
                : 'border-emerald-500/30 bg-emerald-500/[0.06]'
            )}
          >
            <div className="flex items-start gap-3">
              {blocking.length > 0 ? (
                <Ban className="mt-0.5 h-5 w-5 shrink-0 text-danger-500" />
              ) : (
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
              )}
              <div className="min-w-0 flex-1">
                {blocking.length > 0 ? (
                  <>
                    <p className="text-[13px] font-semibold text-text">
                      Refused: {blocking.length} blocking check
                      {blocking.length === 1 ? '' : 's'}. This purge cannot be confirmed.
                    </p>
                    <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
                      Every one of these describes damage landing on a tenant that is not being
                      deleted, so there is no override.{' '}
                      {repairableBlockers.length > 0
                        ? `${repairableBlockers.length} of them ${
                            repairableBlockers.length === 1 ? 'is' : 'are'
                          } a profile mis-link, which can be repaired from here. The rest have to be dealt with outside this screen.`
                        : 'None of them is a profile mis-link, so there is nothing this screen can repair.'}
                    </p>
                  </>
                ) : (
                  <p className="text-[13px] font-semibold text-text">
                    No blocking checks left. The plan above was re-run after the repair.
                  </p>
                )}

                {blocking.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {blocking.map((b) => {
                      // blockerKey, not b.code: cross_tenant_cascade emits one entry per boundary
                      // edge and every one of them carries the SAME code, so keying on code gave
                      // React duplicate keys and let it reuse one edge's node for another's
                      // content.
                      const key = blockerKey(b);
                      const repairable = isRepairableBlocker(b);
                      return (
                        <li
                          key={key}
                          className="rounded-lg border border-themed bg-line/[0.02] p-3"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-mono text-[10px] uppercase tracking-widest2 text-danger-500">
                              {b.code}
                            </p>
                            {repairable ? (
                              <span className="rounded-full border border-brand-cyan/40 bg-brand-cyan/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest2 text-brand-cyan">
                                Repairable
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
                            {b.message}
                          </p>
                          {/* The count is a capped one on this blocker, so it is rendered as a
                              bound and never as a fact. */}
                          {b.code === 'cross_tenant_cascade' ? (
                            <p className="mt-1 text-[11px] text-text-mute">
                              {b.count_capped
                                ? `${formatNumber(b.count)} or more row(s) affected.`
                                : `${formatNumber(b.count)} row(s) affected.`}
                            </p>
                          ) : null}
                          {repairable && repairPlan ? (
                            <RepairEdgeDetail
                              edge={repairEdgesByKey.get(key)}
                              executed={repairPlan.executed}
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                ) : null}

                {/* The two-step itself. One control set, because the endpoint is one call that
                    covers every repairable edge at once; the per-edge reading is above. */}
                {repairableBlockers.length > 0 || repairPlan ? (
                  <div className="mt-4 rounded-lg border border-themed bg-line/[0.02] p-3">
                    <div className="flex items-center gap-2">
                      <Wrench className="h-3.5 w-3.5 shrink-0 text-brand-cyan" />
                      <p className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                        {repairPlan?.executed ? 'Repair receipt' : 'Repair profile mis-links'}
                      </p>
                    </div>

                    {!repairPlan ? (
                      <p className="mt-2 text-[12px] leading-relaxed text-text-dim">
                        These rows carry both their own client and a profile from this one, which
                        is a mis-link rather than ownership. The repair points the profile at the
                        same person's profile inside the row's own tenant. It never changes which
                        tenant a row belongs to and never deletes a row. Planning it reads rows and
                        writes nothing.
                      </p>
                    ) : (
                      <>
                        {/* The backend's own sentences, verbatim. Paraphrasing the one line that
                            states whether anything was written is how a dry run gets read as an
                            apply. */}
                        <p className="mt-2 text-[12px] leading-relaxed text-text-dim">
                          {repairPlan.summary}
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <MiniStat
                            label="Rows found"
                            value={formatNumber(repairPlan.totals.rows_found)}
                          />
                          <MiniStat
                            label={repairPlan.executed ? 'Re-homed' : 'Can re-home'}
                            value={formatNumber(
                              repairPlan.executed
                                ? repairPlan.totals.rehomed
                                : repairPlan.totals.rehomable
                            )}
                          />
                          <MiniStat
                            label="Cannot re-home"
                            value={formatNumber(repairPlan.totals.refused)}
                          />
                          <MiniStat
                            label="Edges"
                            value={formatNumber(repairPlan.totals.edges_affected)}
                          />
                        </div>

                        {repairPlan.totals.refused > 0 ? (
                          <p className="mt-3 text-[12px] leading-relaxed text-text-mute">
                            {formatNumber(repairPlan.totals.refused)} row(s) cannot be re-homed and
                            are left exactly as they are. Nothing is guessed at and nothing is
                            deleted, so the purge stays blocked on those rows until a human decides
                            what they should be. The reason for each is listed against its blocker
                            above.
                          </p>
                        ) : null}

                        {repairPlan.edges.some((e) => e.truncated) ? (
                          <p className="mt-3 text-[12px] leading-relaxed text-text-mute">
                            At least one edge has more broken rows than this call reads
                            ({formatNumber(repairPlan.row_limit)} per edge). What is shown is a
                            page, not the whole problem, and applying it will not clear that edge in
                            one pass.
                          </p>
                        ) : null}

                        {/* A failed edge is louder than the summary line, because a zero in its
                            "re-homed" column otherwise reads as "there was nothing to do". Each
                            edge commits in its own transaction, so one failing says nothing about
                            the rest, and the operator can simply run it again. */}
                        {repairPlan.edges.filter((e) => e.write_error).map((e) => (
                          <p
                            key={`${e.model}.${e.field}`}
                            className="mt-3 text-[12px] leading-relaxed text-danger-500"
                          >
                            {e.model}.{e.field}: the write failed and was rolled back for this edge
                            only ({e.write_error}). The other edges are unaffected. Nothing on this
                            edge moved; plan it again.
                          </p>
                        ))}

                        {repairPlan.executed ? (
                          <p className="mt-3 text-[12px] leading-relaxed text-text-mute">
                            The purge plan above has been re-run, and it is the authority on what
                            still blocks this tenant. This receipt only speaks for the rows it
                            moved: the repair endpoint deliberately does not re-check every
                            crossing itself, because that check is slower than the browser's
                            timeout and would run after these writes had already committed.
                            {repairPlan.audit_id
                              ? ` Recorded as cross-tenant repair #${repairPlan.audit_id}.`
                              : ''}
                          </p>
                        ) : null}

                        <p className="mt-3 text-[11px] leading-relaxed text-text-mute">
                          {repairPlan.scope_note}
                        </p>

                        {/* Named, never counted. An earlier version of this feature repaired all
                            42 profile crossings on the strength of one model's audit, which would
                            have re-homed certificates, payments and proctoring records onto whoever
                            else held the same email address. */}
                        {repairPlan.unaudited_edges?.length ? (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-[11px] text-text-mute">
                              {formatNumber(repairPlan.unaudited_edges.length)} other profile
                              crossing(s) exist that this tool will not repair
                            </summary>
                            <p className="mt-1 font-mono text-[10px] leading-relaxed text-text-mute break-words">
                              {repairPlan.unaudited_edges.join(', ')}
                            </p>
                          </details>
                        ) : null}
                      </>
                    )}

                    {repairMutation.error ? (
                      <p className="mt-3 text-[12px] leading-relaxed text-danger-500">
                        {backendMessage(
                          repairMutation.error,
                          'The repair request failed. Nothing was changed.'
                        )}
                      </p>
                    ) : null}

                    {/* The gate, rendered only when there is something to authorise. Its own input
                        rather than the purge's: that one is hidden while anything blocks, which is
                        exactly when this is needed, and sharing a single box would let a name typed
                        for a repair silently authorise a deletion. */}
                    {pendingRepair ? (
                      <div className="mt-3">
                        <label className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
                          Type <span className="font-bold text-text">{client?.name}</span> to
                          re-home rows in other tenants
                        </label>
                        <input
                          type="text"
                          value={repairConfirmText}
                          onChange={(e) => setRepairConfirmText(e.target.value)}
                          className="mt-2 w-full rounded-lg border border-themed-2 bg-ink-1/40 px-3 py-2
                            font-mono text-[13px] text-text outline-none
                            focus:border-brand-cyan/60 focus:ring-2 focus:ring-brand-cyan/30"
                          placeholder={client?.name}
                        />
                        <p className="mt-2 text-[11px] leading-relaxed text-text-mute">
                          Exact match, spelling and case included. These rows belong to tenants that
                          are not being deleted, and the move cannot be undone once their old
                          profiles go with the purge.
                        </p>
                      </div>
                    ) : null}

                    <div className="mt-3 flex flex-wrap gap-2">
                      {!repairPlan ? (
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={repairMutation.isLoading}
                          disabled={repairMutation.isLoading || busy || queued}
                          onClick={handlePlanRepair}
                        >
                          Plan the repair
                        </Button>
                      ) : null}
                      {pendingRepair ? (
                        <>
                          {/* Reads what it is about to do. The count is in the label because it is
                              the number the operator is authorising, and it is the plan's number
                              rather than the blocker's capped one. Gated on the typed name below
                              for the same reason the purge is: this writes to tenants that are NOT
                              being deleted, so its blast radius is arguably the wider of the two,
                              and it used to be the one with no confirmation at all. */}
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={repairMutation.isLoading}
                            disabled={
                              !repairNameMatches || repairMutation.isLoading || busy || queued
                            }
                            onClick={handleApplyRepair}
                          >
                            Re-home {formatNumber(pendingRepair.totals.rehomable)} row(s)
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={repairMutation.isLoading}
                            onClick={() => {
                              setRepairPlan(null);
                              setRepairConfirmText('');
                              repairMutation.reset();
                            }}
                          >
                            Discard plan
                          </Button>
                        </>
                      ) : null}
                      {repairPlan && !pendingRepair && !repairPlan.executed ? (
                        // A plan with nothing to apply. Re-planning is the only move, and there is
                        // deliberately no Apply button to click on a plan that would write nothing.
                        <Button
                          variant="outline"
                          size="sm"
                          isLoading={repairMutation.isLoading}
                          disabled={repairMutation.isLoading || busy || queued}
                          onClick={handlePlanRepair}
                        >
                          Plan again
                        </Button>
                      ) : null}
                      {repairPlan?.executed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={preview.isFetching || busy || queued}
                          onClick={() => {
                            setRepairPlan(null);
                            setRepairConfirmText('');
                            repairMutation.reset();
                            setConfirmText('');
                            preview.refetch();
                          }}
                        >
                          {preview.isFetching ? 'Previewing...' : 'Preview again'}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ) : null}
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

/** Why a row could not be re-homed, in a sentence that says what the operator has to decide.
 *  Each one is a different next action, which is why repair.py reports a reason string rather than
 *  a boolean, and why these are not collapsed into one "could not be repaired" line. */
const REPAIR_REFUSAL_COPY: Record<RepairRefusalReason, string> = {
  no_profile_in_row_client:
    'that person has no profile in the tenant the row belongs to, so there is nothing to re-home onto',
  ambiguous_profile_in_row_client:
    'more than one profile in that tenant matches the address, and choosing one would be a guess about whose learning history the row becomes',
  unique_collision:
    'the re-homed row would collide with a row that already holds that unique key, and merging them would mean deleting one',
  unique_collision_within_batch:
    'two rows in this batch would land on the same unique key, and merging them would mean deleting one',
  email_identity_not_trusted:
    'the only match is a shared email address, which this platform never verifies, so it is not proof that the two accounts are one person; the target is shown above for review, and a repair on that basis has to be run from a shell',
  target_user_joined_after_row:
    'the matching account in that tenant was created after the row was written, so it cannot be the person who produced it',
};

/** One repairable blocker's own slice of the repair document.
 *
 * `edge` is optional on purpose. The plan only reports edges it found rows on, so a blocker the
 * backend called repairable can still come back with no entry: the crossing cleared between the
 * preview and the plan, or it sits outside the row window. Saying that plainly is the point, since
 * the alternative is an empty space that reads as "handled". */
const RepairEdgeDetail: React.FC<{ edge?: RepairEdge; executed: boolean }> = ({
  edge,
  executed,
}) => {
  if (!edge) {
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-text-mute">
        The repair plan found no rows on this edge. It is still listed as blocking above, so treat
        it as unfixed: re-run the plan, and if it stays empty this crossing needs a look outside the
        portal.
      </p>
    );
  }

  if (edge.error) {
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-danger-500">
        This edge could not be examined: {edge.error}. It is reported rather than skipped, because
        an edge missing from the plan reads as an edge that is fine.
      </p>
    );
  }

  // Grouped rather than listed per row: a 500-row edge produces one line per reason, not 500.
  const refusals = edge.rows.reduce<Record<string, number>>((acc, row) => {
    if (row.action === 'refuse' && row.reason) acc[row.reason] = (acc[row.reason] || 0) + 1;
    return acc;
  }, {});

  const samples = edge.rows.filter((r) => r.action === 'rehome').slice(0, 3);

  /** Candidates the backend found but declined to act on, because the only thing linking the two
   *  accounts is an email address nobody verified. Shown WITH the target so the operator can judge
   *  it: this is the one refusal whose next step is "look at who that is", and hiding the name
   *  would leave them with a count and no way to decide. */
  const untrusted = edge.rows
    .filter((r) => r.reason === 'email_identity_not_trusted' && r.target_profile)
    .slice(0, 3);

  return (
    <div className="mt-2 space-y-1.5 border-t border-themed pt-2 text-[11px] leading-relaxed text-text-mute">
      {edge.write_error ? (
        <p className="text-danger-500">
          The write for this edge failed and was rolled back: {edge.write_error}. Nothing on it
          moved, and the other edges committed independently.
        </p>
      ) : null}
      <p>
        {executed ? (
          <>
            Re-homed {formatNumber(edge.rehomed ?? 0)} of {formatNumber(edge.blocked_rows ?? 0)}{' '}
            row(s) read here.{' '}
            {/* The planner's own re-count through the refusal's queryset. The honest answer to
                "did it work", and the one number that is not this component's opinion. Capped the
                same way the blocker's count is, so it is rendered as a floor when it hits the cap
                rather than as a fact. */}
            {edge.blocked_rows_after === 0
              ? 'This edge no longer blocks the purge.'
              : `${formatNumber(edge.blocked_rows_after ?? 0)}${
                  edge.blocked_rows_after_capped ? ' or more' : ''
                } row(s) still cross on this edge, so it still blocks the purge.`}
          </>
        ) : (
          <>
            {formatNumber(edge.rehomable ?? 0)} of {formatNumber(edge.blocked_rows ?? 0)} row(s)
            read here can be re-homed; {formatNumber(edge.refused ?? 0)} cannot.
          </>
        )}
      </p>

      {edge.truncated ? (
        <p>
          More rows cross on this edge than this call reads, so these numbers describe a page of the
          problem and not all of it.
        </p>
      ) : null}

      {Object.entries(refusals).map(([reason, count]) => (
        <p key={reason}>
          {formatNumber(count)} left untouched because{' '}
          {REPAIR_REFUSAL_COPY[reason as RepairRefusalReason] || `of ${reason}`}.
        </p>
      ))}

      {untrusted.length > 0 ? (
        <div className="pt-0.5">
          <p className="text-text-dim">
            Matched only by email address and therefore NOT moved, for example:
          </p>
          <ul className="mt-1 space-y-0.5">
            {untrusted.map((row) => (
              <li key={row.pk} className="font-mono text-[10px] break-words">
                #{row.pk}: {describeRepairMove(row)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {samples.length > 0 ? (
        <div className="pt-0.5">
          <p className="text-text-dim">
            {executed ? 'Rows moved, for example:' : 'Rows that would move, for example:'}
          </p>
          <ul className="mt-1 space-y-0.5">
            {samples.map((row) => (
              <li key={row.pk} className="font-mono text-[10px] break-words">
                #{row.pk}: {describeRepairMove(row)}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

/** One row's move, written so the tenant hop is visible: the profile changes, the client does not.
 *  `resolved_by` is included because "same email, a different User row" is a materially stronger
 *  claim than "same User", and a reviewer approving the write should see which rule fired. */
const describeRepairMove = (row: RepairRow): string => {
  const from = row.current_profile;
  const to = row.target_profile;
  const who = to?.email || to?.username || 'the matched profile';
  const via = row.resolved_by === 'same_email_other_user_row' ? ' via matching email' : '';
  return (
    `profile ${from?.id ?? '?'} (client ${from?.client_id ?? '?'}) -> ` +
    `profile ${to?.id ?? '?'} (client ${to?.client_id ?? '?'}, ${who})${via}`
  );
};

const MiniStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="font-mono text-[9px] uppercase tracking-widest2 text-text-mute">{label}</p>
    <p className="mt-0.5 text-[14px] font-semibold text-text">{value}</p>
  </div>
);

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
