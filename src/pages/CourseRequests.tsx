import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CalendarRange,
  Check,
  Inbox,
  Layers,
  Pencil,
  RefreshCw,
  X,
} from 'lucide-react';

import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import {
  useApproveCourseRequest,
  useCourseRequests,
  useEditCourseRequest,
  useRejectCourseRequest,
} from '../hooks/useCourseRequests';
import {
  COURSE_REQUEST_STATUS_LABELS,
  COURSE_REQUEST_STATUS_TONE,
  CourseRequestListItem,
  CourseRequestStatus,
} from '../types/courseRequest';
import { cn } from '../utils/helpers';

type Filter = CourseRequestStatus | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'pending', label: 'Awaiting review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

/**
 * The approval queue for AI course generation.
 *
 * Building a whole course is the platform's largest single LLM spend and the quota is shared
 * across every tenant, so an admin re-running a build degrades generation for all of them.
 * Nothing is spent until a request is approved on this page.
 */
const CourseRequests: React.FC = () => {
  const [filter, setFilter] = useState<Filter>('pending');
  const [openId, setOpenId] = useState<number | null>(null);

  const { data, isLoading, refetch, isFetching } = useCourseRequests({ status: filter });
  const rows = data?.results ?? [];

  return (
    <div className="space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-wrap items-end justify-between gap-4"
      >
        <div>
          <span className="kicker mb-3">
            <Inbox className="mr-2 h-3 w-3" />
            Generation queue
          </span>
          <h1 className="text-3xl font-bold tracking-tight">Course requests</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            A full-course build is the largest single model spend on the platform, and the quota
            is shared by every tenant. Nothing is generated until you approve it here — and you
            can trim the ask first.
          </p>
        </div>
        <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCw className={cn('mr-2 h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </motion.section>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full border px-4 py-1.5 text-sm font-semibold transition',
              filter === f.value
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            {f.label}
            {f.value === 'pending' && (data?.pending_count ?? 0) > 0 && (
              <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-600">
                {data?.pending_count}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="rounded-2xl border border-border p-12 text-center text-muted-foreground">
          Loading requests…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Nothing waiting</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === 'pending'
              ? 'No tenant is waiting on a course build.'
              : `No ${filter} requests.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <RequestCard
              key={row.id}
              row={row}
              expanded={openId === row.id}
              onToggle={() => setOpenId(openId === row.id ? null : row.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const RequestCard: React.FC<{
  row: CourseRequestListItem;
  expanded: boolean;
  onToggle: () => void;
}> = ({ row, expanded, onToggle }) => {
  const [weeks, setWeeks] = useState(String(row.brief.duration_weeks ?? ''));
  const [title, setTitle] = useState(row.brief.title);
  const [note, setNote] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const edit = useEditCourseRequest();
  const approve = useApproveCourseRequest();
  const reject = useRejectCourseRequest();

  const busy = edit.isPending || approve.isPending || reject.isPending;
  const pending = row.approval_status === 'pending';

  const dirty = useMemo(
    () => title !== row.brief.title || Number(weeks) !== row.brief.duration_weeks,
    [title, weeks, row.brief]
  );

  // Surfaced up front because spend is the entire reason this gate exists.
  const heavy = row.scale.estimated_items >= 60;

  return (
    <motion.div
      layout
      className="rounded-2xl border border-border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold">{row.brief.title || 'Untitled course'}</h3>
            <span
              className={cn(
                'rounded-full border px-2.5 py-0.5 text-xs font-bold',
                COURSE_REQUEST_STATUS_TONE[row.approval_status]
              )}
            >
              {COURSE_REQUEST_STATUS_LABELS[row.approval_status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <strong>{row.client?.name ?? 'Unknown tenant'}</strong> · requested by{' '}
            {row.requested_by.name || row.requested_by.email}
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <CalendarRange className="h-4 w-4 text-muted-foreground" />
            {row.scale.weeks} weeks
          </span>
          <span className="inline-flex items-center gap-1.5 font-semibold">
            <Layers className="h-4 w-4 text-muted-foreground" />
            {row.scale.submodules} topics
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold',
              heavy ? 'bg-rose-500/10 text-rose-600' : 'bg-muted text-muted-foreground'
            )}
          >
            {heavy && <AlertTriangle className="h-3.5 w-3.5" />}~{row.scale.estimated_items} items
          </span>
          <Button variant="ghost" onClick={onToggle}>
            {expanded ? 'Hide' : 'Review'}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 space-y-5 border-t border-border pt-5">
          {row.brief.description && (
            <p className="text-sm leading-relaxed">{row.brief.description}</p>
          )}
          {row.brief.target_audience && (
            <p className="text-sm text-muted-foreground">
              <strong>For:</strong> {row.brief.target_audience}
            </p>
          )}
          {row.requested_note && (
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <strong>Their note:</strong> {row.requested_note}
            </div>
          )}
          {row.edited_fields.length > 0 && (
            <p className="text-xs font-semibold text-amber-600">
              <Pencil className="mr-1 inline h-3 w-3" />
              You changed: {row.edited_fields.join(', ')} — the requester sees this too.
            </p>
          )}

          {pending && (
            <>
              {/* Trimming the ask is the point of the review. A 20-week request costing ~240
                  generated items is usually a 6-week one that nobody thought about. */}
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <Input
                  label="Course title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={busy}
                />
                <Input
                  label="Weeks"
                  type="number"
                  min={1}
                  max={52}
                  value={weeks}
                  onChange={(e) => setWeeks(e.target.value)}
                  disabled={busy}
                />
              </div>
              {dirty && (
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    edit.mutate({
                      id: row.id,
                      brief: { title, duration_weeks: Number(weeks) || row.brief.duration_weeks },
                    })
                  }
                >
                  <Pencil className="mr-2 h-4 w-4" />
                  Save changes
                </Button>
              )}

              <Input
                label={rejecting ? 'Why are you turning this down?' : 'Note (optional)'}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  rejecting
                    ? 'They see this — a bare no just gets resubmitted.'
                    : 'Anything the requester should know.'
                }
                disabled={busy}
              />

              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={busy || dirty}
                  onClick={() => approve.mutate({ id: row.id, note })}
                  title={dirty ? 'Save your changes first' : undefined}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve and build
                </Button>
                <Button
                  variant="secondary"
                  disabled={busy || (rejecting && !note.trim())}
                  onClick={() => {
                    if (!rejecting) {
                      setRejecting(true);
                      return;
                    }
                    reject.mutate({ id: row.id, note });
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  {rejecting ? 'Confirm rejection' : 'Reject'}
                </Button>
              </div>
              {dirty && (
                <p className="text-xs text-amber-600">
                  Save your changes before approving, or the build runs on the original brief.
                </p>
              )}
            </>
          )}

          {!pending && row.review_note && (
            <div className="rounded-xl bg-muted/50 p-3 text-sm">
              <strong>Your note:</strong> {row.review_note}
              {row.reviewed_by && (
                <span className="ml-2 text-muted-foreground">— {row.reviewed_by}</span>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default CourseRequests;
