import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Building2,
  Layers,
  FileText,
  HelpCircle,
  Code2,
  Video,
  Coins,
  Network,
  ChevronRight,
  ChevronDown,
  Users,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Plus, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import {
  useAdaptiveCourseDetails,
  useAdaptiveCourseTenants,
  useAdaptiveJobs,
  useMapAdaptiveCourse,
  useUnmapAdaptiveCourse,
} from '../hooks/useAdaptiveCourses';
import { useClients } from '../hooks/useClients';
import { ROUTES } from '../utils/constants';
import { cn } from '../utils/helpers';

type Tab = 'overview' | 'content' | 'tenants' | 'tokens' | 'students';

const fmtUsd = (v: string | number): string => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (!n || Number.isNaN(n)) return '$0.00';
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
};

const publishTone = (published: boolean): string =>
  published
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : 'border-themed-2 bg-line/[0.04] text-text-mute';

/* ------------------------------ Content tree ------------------------------ */

const ContentRow: React.FC<{ icon: React.ReactNode; label: string; meta?: string; active?: boolean }> = ({
  icon,
  label,
  meta,
  active = true,
}) => (
  <div className="flex items-center justify-between rounded-md border border-themed px-3 py-2 text-[13px]">
    <span className="flex items-center gap-2 text-text-dim">
      {icon}
      {label}
    </span>
    <span className="flex items-center gap-2">
      {meta && <span className="text-[12px] text-text-mute">{meta}</span>}
      <span
        className={cn(
          'rounded px-1.5 py-0.5 text-[11px]',
          active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-line/[0.05] text-text-mute'
        )}
      >
        {active ? 'active' : 'off'}
      </span>
    </span>
  </div>
);

const ModuleTree: React.FC<{ modules: any[] }> = ({ modules }) => {
  const [open, setOpen] = useState<Record<number, boolean>>(
    () => Object.fromEntries(modules.map((m) => [m.id, true]))
  );
  if (!modules.length) {
    return <div className="py-10 text-center text-text-mute">No modules yet.</div>;
  }
  return (
    <div className="space-y-3">
      {modules.map((m) => (
        <Card key={m.id} padding="none">
          <button
            onClick={() => setOpen((o) => ({ ...o, [m.id]: !o[m.id] }))}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="flex items-center gap-2">
              <span className="rounded-md border border-brand-cyan/30 bg-brand-cyan/10 px-2 py-0.5 text-[12px] text-brand-cyan">
                Week {m.weekno}
              </span>
              <span className="font-medium text-text">{m.title}</span>
            </span>
            {open[m.id] ? (
              <ChevronDown className="h-4 w-4 text-text-mute" />
            ) : (
              <ChevronRight className="h-4 w-4 text-text-mute" />
            )}
          </button>
          {open[m.id] && (
            <div className="space-y-4 border-t border-themed px-4 py-3">
              {(m.submodules || []).map((s: any) => (
                <div key={s.id} className="space-y-2">
                  <p className="text-[13px] font-medium text-text">
                    {s.order}. {s.title}
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {(s.quizzes || []).map((q: any) => (
                      <ContentRow
                        key={`q-${q.config_id}`}
                        icon={<HelpCircle className="h-4 w-4 text-blue-400" />}
                        label={q.title}
                        meta={`${q.mcq_count} MCQs`}
                        active={q.is_active}
                      />
                    ))}
                    {(s.articles || []).map((a: any) => (
                      <ContentRow
                        key={`a-${a.article_id}`}
                        icon={<FileText className="h-4 w-4 text-purple-400" />}
                        label={a.title}
                        meta={a.default_tier}
                        active={a.is_active}
                      />
                    ))}
                    {(s.coding_sets || []).map((c: any, i: number) => (
                      <ContentRow
                        key={`c-${c.config_id || c.id || i}`}
                        icon={<Code2 className="h-4 w-4 text-pink-400" />}
                        label={c.title || 'Coding set'}
                        meta={c.problems ? `${c.problems.length} problems` : undefined}
                        active={c.is_active !== false}
                      />
                    ))}
                    {(s.video_companions || []).map((v: any, i: number) => (
                      <ContentRow
                        key={`v-${v.id || i}`}
                        icon={<Video className="h-4 w-4 text-cyan-400" />}
                        label={v.title || v.video_title || 'Video companion'}
                        active={v.is_active !== false}
                      />
                    ))}
                    {!(s.quizzes || []).length &&
                      !(s.articles || []).length &&
                      !(s.coding_sets || []).length &&
                      !(s.video_companions || []).length && (
                        <p className="text-[12px] text-text-mute">No content in this submodule.</p>
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

/* -------------------------------- Tenants -------------------------------- */

const MapModal: React.FC<{
  courseId: number;
  mappedClientIds: number[];
  onClose: () => void;
}> = ({ courseId, mappedClientIds, onClose }) => {
  const { data: clients = [] } = useClients();
  const mapMutation = useMapAdaptiveCourse();
  const [clientId, setClientId] = useState<number | ''>('');
  const [mode, setMode] = useState<'clone' | 'shared'>('clone');

  const available = clients.filter((c: any) => !mappedClientIds.includes(c.id));

  const submit = async () => {
    if (!clientId) {
      toast.error('Pick a tenant');
      return;
    }
    try {
      await mapMutation.mutateAsync({ courseId, clientId: Number(clientId), mode });
      toast.success(mode === 'clone' ? 'Course cloned into tenant' : 'Course shared with tenant');
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Mapping failed');
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="Map course to a tenant" size="md">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-[13px] text-text-dim">Tenant</label>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-lg border border-themed-2 bg-ink-2 px-3 py-2 text-sm text-text"
          >
            <option value="">Select a tenant…</option>
            {available.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name} (#{c.id})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-[13px] text-text-dim">Mapping mode</label>
          {([
            { key: 'clone', title: 'Clone', desc: 'Independent deep copy in the tenant. Edits to the source do not propagate.' },
            { key: 'shared', title: 'Shared', desc: 'Single source of truth. The tenant sees this course; edits propagate. Requires the source to be published.' },
          ] as const).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setMode(opt.key)}
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-left text-[13px] transition-colors',
                mode === opt.key
                  ? 'border-brand-cyan/50 bg-brand-cyan/10'
                  : 'border-themed-2 hover:border-brand-cyan/30'
              )}
            >
              <span className="font-medium text-text">{opt.title}</span>
              <p className="mt-0.5 text-[12px] text-text-mute">{opt.desc}</p>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} isLoading={mapMutation.isLoading}>
            Map tenant
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const TenantsTab: React.FC<{ courseId: number }> = ({ courseId }) => {
  const { data, isLoading } = useAdaptiveCourseTenants(courseId);
  const unmapMutation = useUnmapAdaptiveCourse();
  const [showMap, setShowMap] = useState(false);

  const mappings = data?.mappings || [];
  const mappedClientIds = mappings.map((m) => m.client?.id).filter(Boolean) as number[];

  const handleUnmap = async (mappingId: number, mode: string) => {
    const deleteClone =
      mode === 'clone'
        ? window.confirm('Also delete the cloned course in that tenant? OK = delete clone, Cancel = keep clone but remove mapping.')
        : false;
    try {
      await unmapMutation.mutateAsync({ courseId, mappingId, deleteClone });
      toast.success('Unmapped');
    } catch {
      toast.error('Unmap failed');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" leftIcon={<Plus className="h-4 w-4" />} onClick={() => setShowMap(true)}>
          Map to tenant
        </Button>
      </div>

      {isLoading ? (
        <div className="py-10 text-center text-text-mute">Loading tenants…</div>
      ) : !mappings.length ? (
        <Card padding="lg">
          <p className="text-text-mute">
            Not mapped to any tenant yet. Use “Map to tenant” to clone or share this course.
          </p>
        </Card>
      ) : (
        <Card padding="none">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-themed text-[12px] uppercase tracking-wide text-text-mute">
              <tr>
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Mode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Enrolled</th>
                <th className="px-4 py-3">Mapped</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {mappings.map((mp) => (
                <tr key={mp.id} className="border-b border-themed/60">
                  <td className="px-4 py-3 text-text">{mp.client?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[12px]',
                        mp.mode === 'clone'
                          ? 'bg-brand-cyan/10 text-brand-cyan'
                          : 'bg-brand-gold/10 text-brand-gold'
                      )}
                    >
                      {mp.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn('rounded border px-2 py-0.5 text-[12px]', publishTone(mp.effective_is_published))}
                    >
                      {mp.effective_is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-dim">{mp.enrollment_count}</td>
                  <td className="px-4 py-3 text-text-mute">
                    {new Date(mp.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleUnmap(mp.id, mp.mode)}
                      className="inline-flex items-center gap-1 text-[12px] text-danger-500 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Unmap
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {showMap && (
        <MapModal
          courseId={courseId}
          mappedClientIds={mappedClientIds}
          onClose={() => setShowMap(false)}
        />
      )}
    </div>
  );
};

/* ------------------------------ Tokens & cost ----------------------------- */

const TokensTab: React.FC<{ course: any }> = ({ course }) => {
  const { data: jobs = [], isLoading } = useAdaptiveJobs(
    course.client?.id ? { client_id: course.client.id } : undefined
  );
  const courseJobs = useMemo(
    () => jobs.filter((j) => j.generated_course_id === course.id),
    [jobs, course.id]
  );
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card padding="sm">
          <p className="text-[12px] uppercase tracking-wide text-text-mute">Total tokens</p>
          <p className="mt-1 text-xl font-semibold text-text">
            {(course.gen_total_tokens || 0).toLocaleString()}
          </p>
        </Card>
        <Card padding="sm">
          <p className="text-[12px] uppercase tracking-wide text-text-mute">Est. cost</p>
          <p className="mt-1 text-xl font-semibold text-text">{fmtUsd(course.gen_cost_usd)}</p>
        </Card>
        <Card padding="sm">
          <p className="text-[12px] uppercase tracking-wide text-text-mute">Generation jobs</p>
          <p className="mt-1 text-xl font-semibold text-text">{courseJobs.length}</p>
        </Card>
      </div>

      {course.gen_total_tokens === 0 && (
        <p className="text-[13px] text-text-mute">
          No token data recorded — this course predates token tracking, or was generated without it.
        </p>
      )}

      {isLoading ? (
        <div className="py-10 text-center text-text-mute">Loading jobs…</div>
      ) : courseJobs.length ? (
        <Card padding="none">
          <table className="w-full text-left text-[13px]">
            <thead className="border-b border-themed text-[12px] uppercase tracking-wide text-text-mute">
              <tr>
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tokens</th>
                <th className="px-4 py-3">Cost</th>
              </tr>
            </thead>
            <tbody>
              {courseJobs.map((j) => (
                <tr key={j.id} className="border-b border-themed/60">
                  <td className="px-4 py-3 text-text">{j.title}</td>
                  <td className="px-4 py-3 text-text-dim">{j.scope}</td>
                  <td className="px-4 py-3 text-text-dim">{j.status}</td>
                  <td className="px-4 py-3 text-text-dim">{(j.total_tokens || 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-text-dim">{fmtUsd(j.estimated_cost_usd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : null}
    </div>
  );
};

/* --------------------------------- Page ---------------------------------- */

const AdaptiveCourseDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const courseId = Number(id);
  const [tab, setTab] = useState<Tab>('overview');

  const { data: course, isLoading, error } = useAdaptiveCourseDetails(courseId);

  if (isLoading) {
    return <div className="py-20 text-center text-text-mute">Loading course…</div>;
  }
  if (error || !course) {
    return (
      <Card padding="lg" className="border-danger-500/30">
        <div className="flex items-center gap-3 text-danger-500">
          <AlertTriangle className="h-5 w-5" />
          Couldn't load this adaptive course.
        </div>
      </Card>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <Sparkles className="h-4 w-4" /> },
    { key: 'content', label: 'Content', icon: <Layers className="h-4 w-4" /> },
    { key: 'tenants', label: 'Tenants', icon: <Network className="h-4 w-4" /> },
    { key: 'tokens', label: 'Tokens & Cost', icon: <Coins className="h-4 w-4" /> },
    { key: 'students', label: 'Students', icon: <Users className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        leftIcon={<ArrowLeft className="h-4 w-4" />}
        onClick={() => navigate(ROUTES.ADAPTIVE_COURSES)}
      >
        Back to Adaptive Courses
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-text">{course.title}</h1>
            {course.is_template && (
              <span className="rounded-md border border-brand-gold/40 bg-brand-gold/15 px-2 py-0.5 text-[12px] text-brand-gold">
                Template
              </span>
            )}
            <span className={cn('rounded-md border px-2 py-0.5 text-[12px]', publishTone(course.is_published))}>
              {course.is_published ? 'Published' : 'Draft'}
            </span>
          </div>
          <p className="mt-1 inline-flex items-center gap-1 text-sm text-text-mute">
            <Building2 className="h-4 w-4" />
            {course.client?.name || 'Unknown tenant'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-themed">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] transition-colors',
              tab === t.key
                ? 'border-brand-cyan text-brand-cyan'
                : 'border-transparent text-text-dim hover:text-text'
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <Card padding="lg">
            <p className="whitespace-pre-line text-sm text-text-dim">
              {course.description || 'No description.'}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {(course.difficulty_levels || []).map((d) => (
                <span key={d} className="rounded-md border border-themed-2 bg-line/[0.04] px-2 py-0.5 text-[12px] text-text-dim">
                  {d}
                </span>
              ))}
            </div>
          </Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Modules', value: course.module_count },
              { label: 'Submodules', value: course.submodule_count },
              { label: 'Quizzes', value: course.quiz_count },
              { label: 'Articles', value: course.article_count },
              { label: 'Coding', value: course.coding_count },
              { label: 'Videos', value: course.video_count },
            ].map((s) => (
              <Card key={s.label} padding="sm">
                <p className="text-[12px] uppercase tracking-wide text-text-mute">{s.label}</p>
                <p className="mt-1 text-lg font-semibold text-text">{s.value}</p>
              </Card>
            ))}
          </div>
        </div>
      )}

      {tab === 'content' && <ModuleTree modules={course.modules || []} />}
      {tab === 'tenants' && <TenantsTab courseId={course.id} />}
      {tab === 'tokens' && <TokensTab course={course} />}
      {tab === 'students' && (
        <Card padding="lg">
          <p className="text-text-mute">
            Per-tenant enrolled students arrive in a later phase.
          </p>
        </Card>
      )}
    </div>
  );
};

export default AdaptiveCourseDetails;
