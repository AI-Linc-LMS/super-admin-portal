import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search,
  Sparkles,
  Building2,
  Layers,
  FileText,
  HelpCircle,
  Code2,
  Video,
  Coins,
  Network,
  AlertTriangle,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import { useAdaptiveCourses } from '../hooks/useAdaptiveCourses';
import { AdaptiveCourseSummary } from '../types/adaptiveCourse';
import { ROUTES } from '../utils/constants';
import { cn } from '../utils/helpers';

type ScopeFilter = 'all' | 'templates' | 'tenant';

const publishTone = (published: boolean): string =>
  published
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : 'border-themed-2 bg-line/[0.04] text-text-mute';

const fmtUsd = (v: string | number): string => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  if (!n || Number.isNaN(n)) return '$0.00';
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
};

const fmtTokens = (n: number): string => {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
};

const CountChip: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <span
    title={label}
    className="inline-flex items-center gap-1 rounded-md border border-themed-2 bg-line/[0.03] px-2 py-0.5 text-[12px] text-text-dim"
  >
    {icon}
    {value}
  </span>
);

const CourseCard: React.FC<{ course: AdaptiveCourseSummary; onOpen: () => void }> = ({
  course,
  onOpen,
}) => (
  <Card hover padding="none" className="cursor-pointer" >
    <div onClick={onOpen} className="flex h-full flex-col">
      <div className="relative h-28 w-full overflow-hidden bg-gradient-to-br from-brand-cyan/10 via-ink-2 to-brand-gold/10">
        {course.card_image_url ? (
          <img
            src={course.card_image_url}
            alt={course.title}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-text-mute">
            <Sparkles className="h-7 w-7 opacity-50" />
          </div>
        )}
        <div className="absolute left-2 top-2 flex gap-1.5">
          {course.is_template && (
            <span className="rounded-md border border-brand-gold/40 bg-brand-gold/15 px-2 py-0.5 text-[11px] font-medium text-brand-gold">
              Template
            </span>
          )}
          {course.cloned_from_id && (
            <span className="rounded-md border border-brand-cyan/40 bg-brand-cyan/15 px-2 py-0.5 text-[11px] font-medium text-brand-cyan">
              Clone
            </span>
          )}
        </div>
        <span
          className={cn(
            'absolute right-2 top-2 rounded-md border px-2 py-0.5 text-[11px] font-medium',
            publishTone(course.is_published)
          )}
        >
          {course.is_published ? 'Published' : 'Draft'}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 text-[15px] font-semibold text-text">{course.title}</h3>
          <p className="mt-1 inline-flex items-center gap-1 text-[12px] text-text-mute">
            <Building2 className="h-3.5 w-3.5" />
            {course.client?.name || 'Unknown tenant'}
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <CountChip icon={<Layers className="h-3.5 w-3.5" />} value={course.module_count} label="Modules" />
          <CountChip icon={<HelpCircle className="h-3.5 w-3.5" />} value={course.quiz_count} label="Quizzes" />
          <CountChip icon={<FileText className="h-3.5 w-3.5" />} value={course.article_count} label="Articles" />
          <CountChip icon={<Code2 className="h-3.5 w-3.5" />} value={course.coding_count} label="Coding" />
          <CountChip icon={<Video className="h-3.5 w-3.5" />} value={course.video_count} label="Videos" />
        </div>

        <div className="mt-auto flex items-center justify-between border-t border-themed pt-3 text-[12px]">
          <span className="inline-flex items-center gap-1 text-text-dim" title="Generation tokens / cost">
            <Coins className="h-3.5 w-3.5 text-brand-gold" />
            {fmtTokens(course.gen_total_tokens)}
            <span className="text-text-mute">·</span>
            {fmtUsd(course.gen_cost_usd)}
          </span>
          {course.is_template && (
            <span className="inline-flex items-center gap-1 text-text-dim" title="Tenants mapped">
              <Network className="h-3.5 w-3.5 text-brand-cyan" />
              {course.mapping_count}
            </span>
          )}
        </div>
      </div>
    </div>
  </Card>
);

const AdaptiveCourses: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<ScopeFilter>('all');

  const { data: courses = [], isLoading, error } = useAdaptiveCourses();

  const filtered = useMemo(() => {
    let list = courses;
    if (scope === 'templates') list = list.filter((c) => c.is_template);
    if (scope === 'tenant') list = list.filter((c) => !c.is_template);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.client?.name || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [courses, scope, search]);

  const totals = useMemo(() => {
    const tokens = courses.reduce((a, c) => a + (c.gen_total_tokens || 0), 0);
    const cost = courses.reduce((a, c) => a + parseFloat(c.gen_cost_usd || '0'), 0);
    return {
      count: courses.length,
      templates: courses.filter((c) => c.is_template).length,
      published: courses.filter((c) => c.is_published).length,
      tokens,
      cost,
    };
  }, [courses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-text">
            <Sparkles className="h-6 w-6 text-brand-gold" />
            Adaptive Courses
          </h1>
          <p className="mt-1 text-sm text-text-mute">
            Every AI-generated adaptive course across all tenants — templates, clones, and live courses.
          </p>
        </div>
      </div>

      {/* KPI rail */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Courses', value: totals.count },
          { label: 'Templates', value: totals.templates },
          { label: 'Published', value: totals.published },
          { label: 'Gen. cost', value: fmtUsd(totals.cost) },
        ].map((kpi) => (
          <Card key={kpi.label} padding="sm">
            <p className="text-[12px] uppercase tracking-wide text-text-mute">{kpi.label}</p>
            <p className="mt-1 text-xl font-semibold text-text">{kpi.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full max-w-xs">
          <Input
            placeholder="Search title or tenant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <div className="inline-flex overflow-hidden rounded-lg border border-themed-2">
          {(['all', 'templates', 'tenant'] as ScopeFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                'px-3 py-2 text-[13px] capitalize transition-colors',
                scope === s
                  ? 'bg-brand-cyan/15 text-brand-cyan'
                  : 'text-text-dim hover:bg-line/[0.05]'
              )}
            >
              {s === 'tenant' ? 'Tenant courses' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="py-20 text-center text-text-mute">Loading adaptive courses…</div>
      ) : error ? (
        <Card padding="lg" className="border-danger-500/30">
          <div className="flex items-center gap-3 text-danger-500">
            <AlertTriangle className="h-5 w-5" />
            Couldn't load adaptive courses. Check that you're signed in as a super admin.
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center text-text-mute">No adaptive courses match your filters.</div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {filtered.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onOpen={() => navigate(ROUTES.ADAPTIVE_COURSE_DETAILS(course.id))}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default AdaptiveCourses;
