import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Users,
  GraduationCap,
  BookOpen,
  Building2,
  Clock,
  Award,
  ArrowUpRight,
  UserCheck,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import StatsCard from '../components/charts/StatsCard';
import { useDashboardStats, useCourses, useClients } from '../hooks/useApi';
import { cn } from '../utils/helpers';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const {
    data: dashboardStats,
    isLoading: statsLoading,
    error: statsError,
  } = useDashboardStats();
  const {
    data: coursesData,
    isLoading: coursesLoading,
    error: coursesError,
  } = useCourses();
  const {
    data: clientsData,
    isLoading: clientsLoading,
    error: clientsError,
  } = useClients();

  const fallbackStats = {
    total_students: 642,
    total_clients: 8,
    total_courses: 25,
    total_active_clients: 7,
  };

  const [showContent, setShowContent] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 3000);

    if (
      dashboardStats !== undefined ||
      coursesData !== undefined ||
      clientsData !== undefined ||
      statsError ||
      coursesError ||
      clientsError
    ) {
      setShowContent(true);
      clearTimeout(timer);
    }

    return () => clearTimeout(timer);
  }, [
    dashboardStats,
    coursesData,
    clientsData,
    statsError,
    coursesError,
    clientsError,
  ]);

  if (!showContent && (statsLoading || coursesLoading || clientsLoading)) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
        <span className="ml-3 text-text-dim">{t('common.loadingDashboard')}</span>
      </div>
    );
  }

  const stats = dashboardStats || fallbackStats;
  const courses = coursesData?.courses?.slice(0, 4) || [];
  const clients = clientsData?.slice(0, 4) || [];
  const showApiWarning = !dashboardStats || !coursesData || !clientsData;

  const getDifficultyLevel = (level: string) => {
    switch (level.toLowerCase()) {
      case 'easy':
        return t('courses.easy');
      case 'medium':
        return t('courses.medium');
      case 'hard':
        return t('courses.hard');
      default:
        return level;
    }
  };

  const difficultyPill = (level: string) => {
    const lvl = level.toLowerCase();
    if (lvl === 'easy')
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    if (lvl === 'medium')
      return 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold';
    return 'border-danger-500/30 bg-danger-500/10 text-danger-500';
  };

  return (
    <div className="space-y-10">
      {/* API Warning */}
      {showApiWarning && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative flex items-start gap-3 overflow-hidden rounded-xl
            border border-brand-gold/25 bg-brand-gold/[0.05] px-4 py-3"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-brand-gold" />
          <div className="text-[13px] leading-relaxed text-text-dim">
            <span className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-brand-gold">
              {t('dashboard.demoMode')}
            </span>
            <span className="ml-2">{t('dashboard.apiWarning')}</span>
          </div>
        </motion.div>
      )}

      {/* Hero header */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <span className="kicker mb-4">
          <Sparkles className="mr-2 h-3 w-3" />
          {t('dashboard.demoMode') === 'Demo Mode' ? 'Live Workspace' : t('dashboard.demoMode')}
        </span>
        <h1 className="serif-display text-[44px] leading-[1.05] text-text md:text-[56px]">
          {t('dashboard.overview')}
          <span className="block gradient-text">{t('dashboard.welcome')}</span>
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-text-dim">
          A real-time pulse on every tenant, every course, every learner — across the AI Linc platform.
        </p>
      </motion.section>

      {/* Stats grid */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatsCard
          title={t('dashboard.totalStudents')}
          value={stats.total_students}
          icon={GraduationCap}
          color="primary"
          format="number"
        />
        <StatsCard
          title={t('dashboard.totalClients')}
          value={stats.total_clients}
          icon={Building2}
          color="secondary"
        />
        <StatsCard
          title={t('dashboard.totalCourses')}
          value={stats.total_courses}
          icon={BookOpen}
          color="accent"
        />
        <StatsCard
          title={t('dashboard.activeClients')}
          value={stats.total_active_clients}
          icon={UserCheck}
          color="primary"
        />
      </motion.section>

      {/* Recent Courses */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.16 }}
        className="relative overflow-hidden rounded-xl border border-themed surface-card p-7 shadow-glass"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px
            bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent"
        />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="kicker mb-3">
              <BookOpen className="mr-2 h-3 w-3" />
              {t('dashboard.recentCourses')}
            </span>
            <h2 className="serif-display text-[24px] text-text">Lesson catalog</h2>
          </div>
          <button
            onClick={() => navigate('/courses')}
            className="group inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase
              tracking-widest2 text-brand-cyan transition-colors hover:text-text"
          >
            {t('dashboard.viewAllCourses')}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {courses.map((course) => (
            <div
              key={course.id}
              className="group relative overflow-hidden rounded-lg border border-themed bg-ink-1/40 p-4
                transition-all duration-200 hover:border-brand-cyan/30 hover:bg-ink-1/70"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="line-clamp-1 text-[15px] font-semibold text-text">
                  {course.title}
                </h3>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2',
                    difficultyPill(course.difficulty_level)
                  )}
                >
                  {getDifficultyLevel(course.difficulty_level)}
                </span>
              </div>
              <p className="mb-4 line-clamp-2 text-[13px] leading-relaxed text-text-dim">
                {course.description}
              </p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-text-mute">
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {course.duration_in_hours}
                  {t('dashboard.hours')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {course.enrolled_students_count} {t('dashboard.students')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Award className="h-3.5 w-3.5" />
                  {course.modules_count} {t('dashboard.modules')}
                </span>
              </div>
            </div>
          ))}
        </div>

        {courses.length === 0 && <EmptyState icon={BookOpen} label={t('courses.noCoursesAvailable')} />}
      </motion.section>

      {/* Recent Clients */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.24 }}
        className="relative overflow-hidden rounded-xl border border-themed surface-card p-7 shadow-glass"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px
            bg-gradient-to-r from-transparent via-brand-blue/40 to-transparent"
        />

        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <span className="kicker mb-3">
              <Building2 className="mr-2 h-3 w-3" />
              {t('dashboard.recentClients')}
            </span>
            <h2 className="serif-display text-[24px] text-text">Tenant snapshot</h2>
          </div>
          <button
            onClick={() => navigate('/clients')}
            className="group inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase
              tracking-widest2 text-brand-cyan transition-colors hover:text-text"
          >
            {t('dashboard.viewAllClients')}
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {clients.map((client) => (
            <button
              key={client.id}
              onClick={() => navigate(`/clients/${client.id}`)}
              className="group relative overflow-hidden rounded-lg border border-themed bg-ink-1/40 p-4 text-left
                transition-all duration-200 hover:border-brand-cyan/30 hover:bg-ink-1/70"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0">
                  <div className="absolute inset-0 rounded-lg bg-brand-grad opacity-90 shadow-[0_8px_24px_-8px_rgba(35,86,214,0.55)]" />
                  <div className="relative flex h-full w-full items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" strokeWidth={1.75} />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[14px] font-semibold text-text">
                    {client.name}
                  </h3>
                  <p className="font-mono text-[11px] uppercase tracking-widest2 text-text-mute">
                    {client.slug}
                  </p>
                </div>
                <ArrowUpRight className="h-4 w-4 text-text-mute opacity-0 transition-all group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-brand-cyan group-hover:opacity-100" />
              </div>
              <div className="flex items-center gap-4 text-[12px] text-text-mute">
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {client.total_students} {t('dashboard.students')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5" />
                  {client.total_courses} {t('navigation.courses').toLowerCase()}
                </span>
              </div>
            </button>
          ))}
        </div>

        {clients.length === 0 && <EmptyState icon={Building2} label={t('clients.noClientsAvailable')} />}
      </motion.section>
    </div>
  );
};

const EmptyState: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}> = ({ icon: Icon, label }) => (
  <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-themed-2 bg-line/[0.02] py-12 text-center">
    <Icon className="mb-3 h-10 w-10 text-text-mute opacity-50" />
    <p className="text-[13px] text-text-mute">{label}</p>
  </div>
);

export default Dashboard;
