import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Code2,
  HelpCircle,
  Database,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
  Building2,
  CheckCircle2,
  Loader2,
  Library,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import {
  useQuestionBankStats,
  useQuestionBankMcqs,
  useQuestionBankCoding,
  useCodingProblemDetail,
} from '../hooks/useQuestionBank';
import { DIFFICULTY_COLORS, PAGINATION } from '../utils/constants';
import { cn } from '../utils/helpers';
import type { CodingBankItem, MCQBankItem } from '../types/questionBank';

type Tab = 'coding' | 'mcq';

function useDebounced<T>(value: T, ms = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

const diffClass = (d?: string | null): string =>
  (DIFFICULTY_COLORS as Record<string, string>)[d || ''] ||
  'border border-themed-2 bg-line/[0.04] text-text-mute';

const verifyClass = (s?: string): string =>
  s === 'passed'
    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : s === 'flagged' || s === 'rejected'
      ? 'border border-danger-500/30 bg-danger-500/10 text-danger-500'
      : 'border border-themed-2 bg-line/[0.04] text-text-mute';

const Pill: React.FC<{ className?: string; children: React.ReactNode }> = ({ className, children }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium', className)}>
    {children}
  </span>
);

// Admin-only badge: this item is in the Verified Library (the curated corpus). Never shown to students.
const LibraryPill: React.FC = () => (
  <Pill className="border border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
    <Library className="h-3 w-3" />
    Library
  </Pill>
);

const StatTile: React.FC<{ icon: React.ReactNode; value: number | string; label: string }> = ({
  icon,
  value,
  label,
}) => (
  <Card className="flex items-center gap-3 px-4 py-3">
    <div className="grid h-10 w-10 place-items-center rounded-lg border border-themed-2 bg-line/[0.04] text-brand-cyan">
      {icon}
    </div>
    <div className="leading-tight">
      <div className="font-mono text-[19px] font-semibold text-text tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-[12px] text-text-mute">{label}</div>
    </div>
  </Card>
);

const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel: string;
}> = ({ value, onChange, options, ariaLabel }) => (
  <select
    aria-label={ariaLabel}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="rounded-lg border border-themed-2 bg-ink-0 px-3 py-2 text-[13px] text-text-dim
      focus:border-brand-cyan/50 focus:outline-none"
  >
    {options.map((o) => (
      <option key={o.value} value={o.value} className="bg-ink-0">
        {o.label}
      </option>
    ))}
  </select>
);

const QuestionBank: React.FC = () => {
  const [tab, setTab] = useState<Tab>('coding');
  const [libraryOnly, setLibraryOnly] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [source, setSource] = useState('');
  const [verification, setVerification] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.DEFAULT_PAGE_SIZE);
  const [openCodingId, setOpenCodingId] = useState<number | null>(null);
  const [openMcq, setOpenMcq] = useState<MCQBankItem | null>(null);

  const search = useDebounced(searchInput);

  // Any filter/tab/size change returns to the first page.
  useEffect(() => {
    setPage(1);
  }, [tab, libraryOnly, search, difficulty, source, verification, pageSize]);

  const params = useMemo(
    () => ({
      page,
      page_size: pageSize,
      search: search || undefined,
      difficulty: difficulty || undefined,
      source: source || undefined,
      verification_status: verification || undefined,
      // Verified Library partition — isolates the curated corpus from the ~142k legacy rows.
      library: libraryOnly ? 'true' : undefined,
    }),
    [page, pageSize, search, difficulty, source, verification, libraryOnly],
  );

  const stats = useQuestionBankStats();
  const coding = useQuestionBankCoding(params, tab === 'coding');
  const mcqs = useQuestionBankMcqs(params, tab === 'mcq');
  const active = tab === 'coding' ? coding : mcqs;
  const data = active.data;
  const total = data?.count ?? 0;
  const numPages = data?.num_pages ?? 1;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const sourceOptions = [
    { value: '', label: 'All sources' },
    { value: 'zskillup_import', label: 'zSkillup' },
    { value: 'manual', label: 'Manual' },
    { value: 'ai_generated', label: 'AI generated' },
    { value: 'course_builder', label: 'Course builder' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-semibold text-text">
            <Database className="h-5 w-5 text-brand-cyan" />
            Question Bank
          </h1>
          <p className="mt-1 text-[13px] text-text-mute">
            Every coding problem and quiz question across the platform. The canonical, Judge0-verified
            store that courses and assessments draw from.
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={<Code2 className="h-5 w-5" />} value={stats.data?.coding.total ?? 0} label="Coding problems" />
        <StatTile icon={<HelpCircle className="h-5 w-5" />} value={stats.data?.mcq.total ?? 0} label="Quiz questions" />
        <StatTile
          icon={<ShieldCheck className="h-5 w-5" />}
          value={(stats.data?.coding.global_verified ?? 0) + (stats.data?.mcq.global_verified ?? 0)}
          label="Global / shared"
        />
        <StatTile
          icon={<Library className="h-5 w-5" />}
          value={(stats.data?.coding.verified_library ?? 0) + (stats.data?.mcq.verified_library ?? 0)}
          label="Verified Library"
        />
      </div>

      {/* Tabs + toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-themed-2 bg-line/[0.03] p-1">
              {(['coding', 'mcq'] as Tab[]).map((t) => {
                const count = libraryOnly
                  ? t === 'coding'
                    ? stats.data?.coding.verified_library
                    : stats.data?.mcq.verified_library
                  : t === 'coding'
                    ? stats.data?.coding.total
                    : stats.data?.mcq.total;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                      tab === t ? 'bg-brand-cyan/15 text-brand-cyan' : 'text-text-mute hover:text-text',
                    )}
                  >
                    {t === 'coding' ? <Code2 className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
                    {t === 'coding' ? 'Coding' : 'MCQs'}
                    <span className="ml-1 rounded bg-line/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-text-dim">
                      {count?.toLocaleString() ?? '—'}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Verified Library partition toggle — isolates the curated corpus from the legacy bank. */}
            <div className="inline-flex rounded-lg border border-themed-2 bg-line/[0.03] p-1">
              <button
                onClick={() => setLibraryOnly(false)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                  !libraryOnly ? 'bg-brand-cyan/15 text-brand-cyan' : 'text-text-mute hover:text-text',
                )}
              >
                All content
              </button>
              <button
                onClick={() => setLibraryOnly(true)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                  libraryOnly ? 'bg-emerald-500/15 text-emerald-400' : 'text-text-mute hover:text-text',
                )}
              >
                <Library className="h-4 w-4" />
                Verified Library
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={tab === 'coding' ? 'Search problems…' : 'Search questions…'}
                className="pl-9"
              />
            </div>
            <Select
              ariaLabel="Difficulty"
              value={difficulty}
              onChange={setDifficulty}
              options={[
                { value: '', label: 'All levels' },
                { value: 'Easy', label: 'Easy' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Hard', label: 'Hard' },
              ]}
            />
            <Select ariaLabel="Source" value={source} onChange={setSource} options={sourceOptions} />
            <Select
              ariaLabel="Verification"
              value={verification}
              onChange={setVerification}
              options={[
                { value: '', label: 'Any status' },
                { value: 'passed', label: 'Verified' },
                { value: 'pending', label: 'Pending' },
                { value: 'flagged', label: 'Flagged' },
              ]}
            />
          </div>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-x-auto rounded-lg border border-themed-2">
          <table className="w-full min-w-[720px] border-collapse text-left">
            <thead>
              <tr className="border-b border-themed-2 bg-line/[0.03] text-[11px] uppercase tracking-wider text-text-mute">
                {tab === 'coding' ? (
                  <>
                    <th className="px-4 py-2.5 font-medium">Problem</th>
                    <th className="px-3 py-2.5 font-medium">Level</th>
                    <th className="px-3 py-2.5 font-medium">Languages</th>
                    <th className="px-3 py-2.5 font-medium">Tests</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 font-medium">Verified</th>
                    <th className="px-3 py-2.5 font-medium">Tenant</th>
                  </>
                ) : (
                  <>
                    <th className="px-4 py-2.5 font-medium">Question</th>
                    <th className="px-3 py-2.5 font-medium">Level</th>
                    <th className="px-3 py-2.5 font-medium">Type</th>
                    <th className="px-3 py-2.5 font-medium">Topic</th>
                    <th className="px-3 py-2.5 font-medium">Source</th>
                    <th className="px-3 py-2.5 font-medium">Verified</th>
                    <th className="px-3 py-2.5 font-medium">Tenant</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {active.isLoading && !data ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-text-mute">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : total === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-[13px] text-text-mute">
                    No {tab === 'coding' ? 'coding problems' : 'questions'} match your filters.
                  </td>
                </tr>
              ) : tab === 'coding' ? (
                (coding.data?.results ?? []).map((c: CodingBankItem) => (
                  <tr
                    key={c.id}
                    onClick={() => setOpenCodingId(c.id)}
                    className="cursor-pointer border-b border-themed-2/60 text-[13px] transition-colors hover:bg-line/[0.03]"
                  >
                    <td className="max-w-[320px] px-4 py-2.5">
                      <div className="truncate font-medium text-text">{c.title}</div>
                      {c.topic && <div className="truncate text-[11px] text-text-mute">{c.topic}</div>}
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill className={diffClass(c.difficulty_level)}>{c.difficulty_level}</Pill>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap gap-1">
                        {c.languages.slice(0, 4).map((l) => (
                          <span key={l} className="rounded bg-line/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-text-dim">
                            {l}
                          </span>
                        ))}
                        {c.languages.length > 4 && (
                          <span className="text-[10px] text-text-mute">+{c.languages.length - 4}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-text-dim tabular-nums">{c.test_case_count}</td>
                    <td className="px-3 py-2.5 text-text-mute">{c.source.replace('_', ' ')}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <Pill className={verifyClass(c.verification_status)}>{c.verification_status}</Pill>
                        {c.in_verified_library && <LibraryPill />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-text-mute">{c.client_name}</td>
                  </tr>
                ))
              ) : (
                (mcqs.data?.results ?? []).map((m: MCQBankItem) => (
                  <tr
                    key={m.id}
                    onClick={() => setOpenMcq(m)}
                    className="cursor-pointer border-b border-themed-2/60 text-[13px] transition-colors hover:bg-line/[0.03]"
                  >
                    <td className="max-w-[360px] px-4 py-2.5">
                      <div className="line-clamp-2 text-text">{m.question_text}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Pill className={diffClass(m.difficulty_level)}>{m.difficulty_level}</Pill>
                    </td>
                    <td className="px-3 py-2.5 text-text-mute">
                      {m.question_style === 'multiple' ? 'Multi-select' : 'Single'}
                    </td>
                    <td className="max-w-[160px] truncate px-3 py-2.5 text-text-mute">{m.topic || '—'}</td>
                    <td className="px-3 py-2.5 text-text-mute">{m.source.replace('_', ' ')}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        <Pill className={verifyClass(m.verification_status)}>{m.verification_status}</Pill>
                        {m.in_verified_library && <LibraryPill />}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-text-mute">{m.client_name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[13px] text-text-mute">
          <div className="flex items-center gap-2">
            <span>
              {from.toLocaleString()}–{to.toLocaleString()} of{' '}
              <span className="font-medium text-text-dim">{total.toLocaleString()}</span>
            </span>
            {active.isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin text-text-mute" />}
            <Select
              ariaLabel="Rows per page"
              value={String(pageSize)}
              onChange={(v) => setPageSize(Number(v))}
              options={PAGINATION.PAGE_SIZE_OPTIONS.map((n) => ({ value: String(n), label: `${n} / page` }))}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="grid h-8 w-8 place-items-center rounded-lg border border-themed-2 text-text-dim
                transition-colors hover:bg-line/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 font-mono text-[12px] text-text-dim tabular-nums">
              {page} / {numPages}
            </span>
            <button
              disabled={page >= numPages}
              onClick={() => setPage((p) => Math.min(numPages, p + 1))}
              className="grid h-8 w-8 place-items-center rounded-lg border border-themed-2 text-text-dim
                transition-colors hover:bg-line/[0.05] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {openCodingId != null && <CodingDetailModal id={openCodingId} onClose={() => setOpenCodingId(null)} />}
      {openMcq && <McqDetailModal mcq={openMcq} onClose={() => setOpenMcq(null)} />}
    </div>
  );
};

// ---- Detail modals ----
const ModalShell: React.FC<{ title: React.ReactNode; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-ink-0/70 p-4 backdrop-blur-sm">
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="my-8 w-full max-w-3xl rounded-2xl border border-themed bg-ink-0 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-start justify-between gap-4 border-b border-themed px-5 py-4">
        <div className="min-w-0">{title}</div>
        <button
          onClick={onClose}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-text-mute hover:bg-line/[0.06] hover:text-text"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
    </motion.div>
  </div>
);

const CodingDetailModal: React.FC<{ id: number; onClose: () => void }> = ({ id, onClose }) => {
  const { data, isLoading } = useCodingProblemDetail(id);
  const [lang, setLang] = useState<string | null>(null);
  const langs = data ? Object.keys(data.template_code || {}) : [];
  const activeLang = lang || langs[0] || '';
  return (
    <div onClick={onClose}>
      <ModalShell
        onClose={onClose}
        title={
          <div>
            <div className="truncate text-[16px] font-semibold text-text">{data?.title || 'Coding problem'}</div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {data && <Pill className={diffClass(data.difficulty_level)}>{data.difficulty_level}</Pill>}
              {data && <Pill className={verifyClass(data.verification_status)}>{data.verification_status}</Pill>}
              {data?.in_verified_library && <LibraryPill />}
              {data?.external_ref && (
                <span className="font-mono text-[11px] text-text-mute">{data.external_ref}</span>
              )}
            </div>
          </div>
        }
      >
        {isLoading || !data ? (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-text-mute" />
          </div>
        ) : (
          <div className="space-y-4 text-[13px] text-text-dim">
            <Section label="Statement">
              <pre className="whitespace-pre-wrap font-sans text-text-dim">{data.problem_statement}</pre>
            </Section>
            {data.constraints && (
              <Section label="Constraints">
                <pre className="whitespace-pre-wrap font-mono text-[12px]">{data.constraints}</pre>
              </Section>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {data.sample_input && (
                <Section label="Sample input">
                  <pre className="whitespace-pre-wrap font-mono text-[12px]">{data.sample_input}</pre>
                </Section>
              )}
              {data.sample_output && (
                <Section label="Sample output">
                  <pre className="whitespace-pre-wrap font-mono text-[12px]">{data.sample_output}</pre>
                </Section>
              )}
            </div>
            <Section label={`Test cases (${data.test_cases?.length ?? 0}) · limits ${data.time_limit}s / ${data.memory_limit}MB`}>
              <div className="space-y-2">
                {(data.test_cases || []).slice(0, 6).map((tc, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border border-themed-2 p-2">
                    <div>
                      <div className="mb-1 text-[10px] uppercase text-text-mute">in</div>
                      <pre className="whitespace-pre-wrap font-mono text-[11px]">{tc.input}</pre>
                    </div>
                    <div>
                      <div className="mb-1 text-[10px] uppercase text-text-mute">out</div>
                      <pre className="whitespace-pre-wrap font-mono text-[11px]">{tc.expected_output}</pre>
                    </div>
                  </div>
                ))}
                {(data.test_cases?.length ?? 0) > 6 && (
                  <div className="text-[11px] text-text-mute">+{(data.test_cases?.length ?? 0) - 6} more</div>
                )}
              </div>
            </Section>
            {langs.length > 0 && (
              <Section label="Starter templates">
                <div className="mb-2 flex flex-wrap gap-1">
                  {langs.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLang(l)}
                      className={cn(
                        'rounded-md px-2 py-1 font-mono text-[11px]',
                        l === activeLang ? 'bg-brand-cyan/15 text-brand-cyan' : 'bg-line/[0.05] text-text-mute',
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <pre className="max-h-64 overflow-auto rounded-lg border border-themed-2 bg-line/[0.03] p-3 font-mono text-[12px] text-text-dim">
                  {data.template_code?.[activeLang] || ''}
                </pre>
              </Section>
            )}
          </div>
        )}
      </ModalShell>
    </div>
  );
};

const McqDetailModal: React.FC<{ mcq: MCQBankItem; onClose: () => void }> = ({ mcq, onClose }) => {
  const opts: [string, string][] = [
    ['A', mcq.option_a],
    ['B', mcq.option_b],
    ['C', mcq.option_c],
    ['D', mcq.option_d],
  ];
  const correct = new Set(mcq.correct_options?.length ? mcq.correct_options : [mcq.correct_option]);
  return (
    <div onClick={onClose}>
      <ModalShell
        onClose={onClose}
        title={
          <div className="flex flex-wrap items-center gap-2">
            <Pill className={diffClass(mcq.difficulty_level)}>{mcq.difficulty_level}</Pill>
            <Pill className="border border-themed-2 bg-line/[0.04] text-text-mute">
              {mcq.question_style === 'multiple' ? 'Multi-select' : 'Single'}
            </Pill>
            <Pill className={verifyClass(mcq.verification_status)}>{mcq.verification_status}</Pill>
            {mcq.in_verified_library && <LibraryPill />}
            <span className="inline-flex items-center gap-1 text-[11px] text-text-mute">
              <Building2 className="h-3 w-3" />
              {mcq.client_name}
            </span>
          </div>
        }
      >
        <div className="space-y-4 text-[13px]">
          <p className="whitespace-pre-wrap text-text">{mcq.question_text}</p>
          <div className="space-y-2">
            {opts.map(([letter, text]) => {
              const isRight = correct.has(letter);
              return (
                <div
                  key={letter}
                  className={cn(
                    'flex items-start gap-2 rounded-lg border px-3 py-2',
                    isRight
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-text'
                      : 'border-themed-2 text-text-dim',
                  )}
                >
                  <span className="font-mono text-[12px] text-text-mute">{letter}</span>
                  <span className="flex-1">{text || <span className="text-text-mute">—</span>}</span>
                  {isRight && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />}
                </div>
              );
            })}
          </div>
          {mcq.explanation && (
            <Section label="Explanation">
              <pre className="whitespace-pre-wrap font-sans text-text-dim">{mcq.explanation}</pre>
            </Section>
          )}
          {(mcq.topic || mcq.tags) && (
            <div className="text-[12px] text-text-mute">
              {mcq.topic && <span className="mr-3">Topic: {mcq.topic}</span>}
              {mcq.tags && <span>Tags: {mcq.tags}</span>}
            </div>
          )}
        </div>
      </ModalShell>
    </div>
  );
};

const Section: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-text-mute">{label}</div>
    {children}
  </div>
);

export default QuestionBank;
