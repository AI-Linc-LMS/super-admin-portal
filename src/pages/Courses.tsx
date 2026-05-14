import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Plus,
  Eye,
  Edit,
  BookOpen,
  Users,
  Clock,
  IndianRupee,
  Download,
  Grid,
  List,
  EyeOff,
  AlertTriangle,
  CheckSquare,
  Square,
  Settings,
  Layers,
  ChevronDown,
  LucideIcon,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import CourseDetailsModal from '../components/ui/CourseDetailsModal';
import CourseUpdateModal from '../components/ui/CourseUpdateModal';
import BulkOperationsModal from '../components/ui/BulkOperationsModal';
import BulkOperationProgressModal from '../components/ui/BulkOperationProgressModal';
import { Course } from '../types/course';
import { useCourses } from '../hooks/useApi';
import { useUpdateCourse } from '../hooks/useClients';
import { useBulkCourseOperations } from '../hooks/useBulkCourseOperations';
import { cn } from '../utils/helpers';
import toast from 'react-hot-toast';

/* ---------- Theme helpers (replace light-only helpers from utils) ---------- */

const difficultyTone = (level: string): string => {
  switch (level.toLowerCase()) {
    case 'easy':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
    case 'medium':
      return 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold';
    case 'hard':
      return 'border-danger-500/30 bg-danger-500/10 text-danger-500';
    default:
      return 'border-themed-2 bg-line/[0.04] text-text-mute';
  }
};

const publishTone = (published: boolean): string =>
  published
    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
    : 'border-danger-500/30 bg-danger-500/10 text-danger-500';

const pricingTone = (isFree: boolean): string =>
  isFree
    ? 'border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan'
    : 'border-brand-gold/30 bg-brand-gold/10 text-brand-gold';

/* ---------- Page ---------- */

const Courses: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<
    'all' | 'Easy' | 'Medium' | 'Hard'
  >('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished'>(
    'all'
  );
  const [pricingFilter, setPricingFilter] = useState<'all' | 'free' | 'paid'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [isBulkOperationsModalOpen, setIsBulkOperationsModalOpen] = useState(false);
  const [isBulkProgressModalOpen, setIsBulkProgressModalOpen] = useState(false);
  const [currentBulkOperation, setCurrentBulkOperation] = useState<
    'publish' | 'unpublish' | 'make_free' | 'make_paid' | null
  >(null);
  const [currentBulkPrice, setCurrentBulkPrice] = useState<number | undefined>(undefined);

  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState<Course | null>(
    null
  );
  const [isCourseUpdateModalOpen, setIsCourseUpdateModalOpen] = useState(false);
  const [isCourseDetailsModalOpen, setIsCourseDetailsModalOpen] = useState(false);

  const { data: coursesResponse, isLoading, error } = useCourses();
  const updateCourseMutation = useUpdateCourse();
  const bulkOperations = useBulkCourseOperations();

  const handleCourseUpdateConfirm = async (
    courseId: number,
    courseData: {
      price?: number;
      is_free?: boolean;
      published?: boolean;
      enrollment_enabled?: boolean;
      content_lock_enabled?: boolean;
    }
  ) => {
    try {
      await updateCourseMutation.mutateAsync({
        clientId: 1,
        courseId,
        courseData,
      });
      toast.success(t('messages.itemUpdatedSuccessfully'));
    } catch (error) {
      console.error('Failed to update course:', error);
      toast.error(t('errors.somethingWentWrong'));
      throw error;
    }
  };

  const closeCourseDetailsModal = () => {
    setIsCourseDetailsModalOpen(false);
    setSelectedCourseForDetails(null);
  };
  const closeCourseUpdateModal = () => {
    setIsCourseUpdateModalOpen(false);
    setSelectedCourse(null);
  };

  const handleCourseSelection = (course: Course, isSelected: boolean) => {
    if (isSelected) setSelectedCourses((prev) => [...prev, course]);
    else setSelectedCourses((prev) => prev.filter((c) => c.id !== course.id));
  };
  const handleSelectAll = () => {
    if (selectedCourses.length === filteredCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses([...filteredCourses]);
    }
  };
  const handleBulkOperation = () => {
    if (selectedCourses.length === 0) {
      toast.error('Please select at least one course');
      return;
    }
    setIsBulkOperationsModalOpen(true);
  };
  const handleBulkOperationConfirm = async (
    operation: 'publish' | 'unpublish' | 'make_free' | 'make_paid',
    price?: number
  ) => {
    setCurrentBulkOperation(operation);
    setCurrentBulkPrice(price);
    setIsBulkOperationsModalOpen(false);
    setIsBulkProgressModalOpen(true);
    try {
      await bulkOperations.executeBulkOperation(selectedCourses, operation, price);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    }
  };
  const handleBulkOperationComplete = () => {
    setIsBulkProgressModalOpen(false);
    setSelectedCourses([]);
    setCurrentBulkOperation(null);
    setCurrentBulkPrice(undefined);
    bulkOperations.resetState();
  };
  const isCourseSelected = (course: Course) =>
    selectedCourses.some((c) => c.id === course.id);

  const mockCourses: Course[] = [
    {
      id: 1,
      title: 'Web Project Development',
      subtitle: 'Learn modern web development',
      slug: 'web-project-development',
      description:
        'Comprehensive introduction to web development concepts and applications.',
      difficulty_level: 'Easy',
      duration_in_hours: 40,
      price: '299.00',
      is_free: false,
      certificate_available: true,
      thumbnail: null,
      published: true,
      enrolled_students_count: 2450,
      instructors: [{ id: 1, name: 'Dr. Sarah Johnson', bio: 'Web development expert' }],
      modules_count: 8,
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-05-20T14:45:00Z',
    },
    {
      id: 2,
      title: 'Backend development on MERN',
      subtitle: 'Master the MERN stack',
      slug: 'backend-development-mern',
      description: 'Deep dive into MERN stack backend development.',
      difficulty_level: 'Hard',
      duration_in_hours: 80,
      price: '599.00',
      is_free: false,
      certificate_available: true,
      thumbnail: null,
      published: true,
      enrolled_students_count: 1890,
      instructors: [{ id: 2, name: 'Prof. Michael Chen', bio: 'Backend specialist' }],
      modules_count: 12,
      created_at: '2024-02-01T00:00:00Z',
      updated_at: '2024-05-15T00:00:00Z',
    },
    {
      id: 3,
      title: 'Data Science Bootcamp',
      subtitle: 'Complete data science course',
      slug: 'data-science-bootcamp',
      description: 'Complete data science course from basics to advanced analytics.',
      difficulty_level: 'Medium',
      duration_in_hours: 60,
      price: '0.00',
      is_free: true,
      certificate_available: false,
      thumbnail: null,
      published: false,
      enrolled_students_count: 0,
      instructors: [{ id: 3, name: 'Dr. Emily Davis', bio: 'Data science expert' }],
      modules_count: 10,
      created_at: '2024-03-10T00:00:00Z',
      updated_at: '2024-05-01T00:00:00Z',
    },
  ];

  const coursesData = coursesResponse?.courses || mockCourses;

  const filteredCourses = coursesData.filter((course) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      course.title.toLowerCase().includes(q) ||
      course.description?.toLowerCase().includes(q) ||
      course.subtitle?.toLowerCase().includes(q);
    const matchesDifficulty =
      difficultyFilter === 'all' || course.difficulty_level === difficultyFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && course.published) ||
      (statusFilter === 'unpublished' && !course.published);
    const matchesPricing =
      pricingFilter === 'all' ||
      (pricingFilter === 'free' && course.is_free) ||
      (pricingFilter === 'paid' && !course.is_free);
    return matchesSearch && matchesDifficulty && matchesStatus && matchesPricing;
  });

  const exportCourses = () => {
    const csvData = filteredCourses.map((course) => ({
      Title: course.title,
      Subtitle: course.subtitle || '',
      Difficulty: course.difficulty_level,
      Status: course.published ? 'Published' : 'Unpublished',
      Type: course.is_free ? 'Free' : 'Paid',
      Price: course.is_free ? 'Free' : `₹${course.price}`,
      Enrollments: course.enrolled_students_count,
      Duration: `${course.duration_in_hours}h`,
      Instructor: course.instructors[0]?.name || 'Unknown',
      Modules: course.modules_count,
    }));
    console.log('Exporting courses:', csvData);
    toast.success(t('messages.dataLoadedSuccessfully'));
  };

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

  if (isLoading && !coursesResponse) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-themed border-t-brand-cyan" />
        <span className="ml-3 text-text-dim">{t('courses.loadingCourses')}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 rounded-xl border border-brand-gold/25 bg-brand-gold/[0.05] px-4 py-3"
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
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <span className="kicker mb-3">
            <Layers className="mr-2 h-3 w-3" />
            Catalog
          </span>
          <h1 className="serif-display text-[40px] leading-[1.05] text-text">
            {t('courses.title').split(' ')[0]}{' '}
            <span className="gradient-text">
              {t('courses.title').split(' ').slice(1).join(' ') || 'library'}
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-text-dim">
            {t('courses.subtitle', {
              defaultValue: 'Manage global AI-Linc course catalog',
            })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex items-center rounded-lg border border-themed-2 bg-ink-1/40 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-brand-cyan/15 text-brand-cyan shadow-[inset_0_0_0_1px_rgba(0,224,255,0.3)]'
                  : 'text-text-mute hover:text-text'
              )}
              aria-label="Grid view"
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md px-2.5 py-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-brand-cyan/15 text-brand-cyan shadow-[inset_0_0_0_1px_rgba(0,224,255,0.3)]'
                  : 'text-text-mute hover:text-text'
              )}
              aria-label="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="outline"
            leftIcon={<Download className="h-4 w-4" />}
            onClick={exportCourses}
          >
            {t('common.export', { defaultValue: 'Export' })}
          </Button>
          <Button leftIcon={<Plus className="h-4 w-4" />}>{t('courses.addCourse')}</Button>
        </div>
      </motion.section>

      {/* Bulk Operations Bar */}
      <AnimatePresence>
        {selectedCourses.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-xl border border-brand-cyan/30 bg-brand-cyan/[0.06] p-4 shadow-glow"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/60 to-transparent"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-cyan/15">
                    <CheckSquare className="h-4 w-4 text-brand-cyan" />
                  </div>
                  <span className="text-[14px] font-medium text-text">
                    {selectedCourses.length} course
                    {selectedCourses.length !== 1 ? 's' : ''} selected
                  </span>
                </div>
                <button
                  onClick={handleSelectAll}
                  className="font-mono text-[11px] font-semibold uppercase tracking-widest2 text-brand-cyan hover:text-text transition-colors"
                >
                  {selectedCourses.length === filteredCourses.length
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelectedCourses([])}>
                  Clear Selection
                </Button>
                <Button
                  size="sm"
                  leftIcon={<Settings className="h-3.5 w-3.5" />}
                  onClick={handleBulkOperation}
                >
                  Bulk Operations
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="relative overflow-hidden rounded-xl border border-themed surface-card p-4 shadow-glass"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/15 to-transparent"
        />
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input
              placeholder={t('courses.searchCourses')}
              leftIcon={<Search className="h-4 w-4" />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ThemedSelect
              value={difficultyFilter}
              onChange={(v) => setDifficultyFilter(v as any)}
              options={[
                { value: 'all', label: `${t('filters.all')} ${t('courses.difficultyLevel')}` },
                { value: 'Easy', label: t('courses.easy') },
                { value: 'Medium', label: t('courses.medium') },
                { value: 'Hard', label: t('courses.hard') },
              ]}
            />
            <ThemedSelect
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as any)}
              options={[
                { value: 'all', label: `${t('filters.all')} ${t('clients.status')}` },
                { value: 'published', label: t('courses.published', { defaultValue: 'Published' }) },
                { value: 'unpublished', label: t('courses.unpublished', { defaultValue: 'Unpublished' }) },
              ]}
            />
            <ThemedSelect
              value={pricingFilter}
              onChange={(v) => setPricingFilter(v as any)}
              options={[
                { value: 'all', label: `${t('filters.all')} ${t('courses.pricing', { defaultValue: 'Pricing' })}` },
                { value: 'free', label: t('courses.free', { defaultValue: 'Free' }) },
                { value: 'paid', label: t('courses.paid', { defaultValue: 'Paid' }) },
              ]}
            />
          </div>
        </div>
      </motion.section>

      {/* Body */}
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.12 }}
      >
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course, i) => (
              <CourseCard
                key={course.id}
                course={course}
                index={i}
                selected={isCourseSelected(course)}
                onSelect={(s) => handleCourseSelection(course, s)}
                onView={() => {
                  setSelectedCourseForDetails(course);
                  setIsCourseDetailsModalOpen(true);
                }}
                onEdit={() => {
                  setSelectedCourse(course);
                  setIsCourseUpdateModalOpen(true);
                }}
                getDifficultyLevel={getDifficultyLevel}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-xl border border-themed surface-card shadow-glass">
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-cyan/30 to-transparent"
            />
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-themed bg-ink-1/30">
                    <th className="px-6 py-3 text-left">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute transition-colors hover:text-brand-cyan"
                      >
                        {selectedCourses.length === filteredCourses.length &&
                        filteredCourses.length > 0 ? (
                          <CheckSquare className="h-3.5 w-3.5 text-brand-cyan" />
                        ) : (
                          <Square className="h-3.5 w-3.5" />
                        )}
                        All
                      </button>
                    </th>
                    {['Course', 'Category', 'Difficulty', 'Status', 'Enrollments', 'Modules', 'Price', 'Actions'].map(
                      (h) => (
                        <th
                          key={h}
                          className={cn(
                            'whitespace-nowrap px-6 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute',
                            h === 'Actions' && 'text-right'
                          )}
                        >
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredCourses.map((course) => {
                    const isSelected = isCourseSelected(course);
                    return (
                      <tr
                        key={course.id}
                        className={cn(
                          'border-b border-themed transition-colors last:border-b-0 hover:bg-line/[0.03]',
                          !course.published && 'opacity-75',
                          isSelected && 'bg-brand-cyan/[0.04]'
                        )}
                      >
                        <td className="px-6 py-4">
                          <Checkbox
                            checked={isSelected}
                            onChange={(s) => handleCourseSelection(course, s)}
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="relative">
                            {!course.published && (
                              <div className="absolute -left-2 top-0 bottom-0 w-0.5 rounded-full bg-danger-500" />
                            )}
                            <div className="flex items-center gap-2">
                              <p
                                className={cn(
                                  'text-[14px] font-medium',
                                  !course.published ? 'text-text-dim' : 'text-text'
                                )}
                              >
                                {course.title}
                              </p>
                              {!course.published && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-danger-500/30 bg-danger-500/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2 text-danger-500">
                                  <EyeOff className="h-2.5 w-2.5" />
                                  Draft
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-[12px] text-text-dim">
                              {course.instructors[0]?.name || 'Unknown'}
                            </p>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text-dim">
                          {course.subtitle}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <Pill className={difficultyTone(course.difficulty_level)}>
                            {course.difficulty_level}
                          </Pill>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <Pill className={publishTone(course.published)}>
                            {course.published ? (
                              <>
                                <Eye className="mr-1 h-2.5 w-2.5" /> Published
                              </>
                            ) : (
                              <>
                                <EyeOff className="mr-1 h-2.5 w-2.5" /> Unpublished
                              </>
                            )}
                          </Pill>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text">
                          {course.enrolled_students_count.toLocaleString()}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-[13px] text-text">
                          {course.modules_count}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <Pill className={pricingTone(course.is_free)}>
                            {course.is_free ? 'Free' : `₹${course.price}`}
                          </Pill>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCourseForDetails(course);
                                setIsCourseDetailsModalOpen(true);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedCourse(course);
                                setIsCourseUpdateModalOpen(true);
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {filteredCourses.length === 0 && (
          <div className="mt-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-themed-2 bg-line/[0.02] py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-themed bg-line/[0.03]">
              <BookOpen className="h-6 w-6 text-text-mute" />
            </div>
            <h3 className="text-[16px] font-semibold text-text">
              {t('courses.noCoursesAvailable')}
            </h3>
            <p className="mt-2 text-[13px] text-text-dim">
              {t('filters.tryAdjusting', {
                defaultValue: 'Try adjusting your search or filter criteria',
              })}
            </p>
          </div>
        )}
      </motion.section>

      {selectedCourseForDetails && (
        <CourseDetailsModal
          isOpen={isCourseDetailsModalOpen}
          onClose={closeCourseDetailsModal}
          course={selectedCourseForDetails}
        />
      )}
      {selectedCourse && (
        <CourseUpdateModal
          isOpen={isCourseUpdateModalOpen}
          onClose={closeCourseUpdateModal}
          course={selectedCourse}
          onConfirm={handleCourseUpdateConfirm}
          isLoading={updateCourseMutation.isPending}
        />
      )}
      <BulkOperationsModal
        isOpen={isBulkOperationsModalOpen}
        onClose={() => setIsBulkOperationsModalOpen(false)}
        selectedCourses={selectedCourses}
        onConfirm={handleBulkOperationConfirm}
        isLoading={bulkOperations.isExecuting}
      />
      <BulkOperationProgressModal
        isOpen={isBulkProgressModalOpen}
        onClose={handleBulkOperationComplete}
        operation={currentBulkOperation!}
        price={currentBulkPrice}
        totalCourses={selectedCourses.length}
        completedCourses={bulkOperations.progress.completed}
        results={bulkOperations.progress.results}
        isComplete={!bulkOperations.isExecuting}
        onRetry={() => {
          if (currentBulkOperation) {
            handleBulkOperationConfirm(currentBulkOperation, currentBulkPrice);
          }
        }}
      />
    </div>
  );
};

/* ---------- Sub-components ---------- */

const Pill: React.FC<{ className?: string; children: React.ReactNode }> = ({
  className,
  children,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest2',
      className
    )}
  >
    {children}
  </span>
);

const Checkbox: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({
  checked,
  onChange,
}) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onChange(!checked);
    }}
    className={cn(
      'flex h-4 w-4 items-center justify-center rounded border transition-all',
      checked
        ? 'border-brand-cyan bg-brand-cyan/15 text-brand-cyan shadow-[0_0_10px_-2px_rgba(0,224,255,0.5)]'
        : 'border-themed-2 bg-ink-1/40 text-transparent hover:border-brand-cyan/50'
    )}
    aria-pressed={checked}
  >
    {checked && <CheckSquare className="h-3 w-3" strokeWidth={2.5} />}
  </button>
);

const ThemedSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}> = ({ value, onChange, options }) => (
  <div className="relative">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 appearance-none rounded-lg border border-themed-2 bg-ink-1/60 pl-3 pr-9
        text-[13px] text-text transition-colors
        focus:outline-none focus:border-brand-cyan/40 focus:bg-ink-1/90
        focus:shadow-[0_0_0_3px_rgba(0,224,255,0.10)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
  </div>
);

interface CourseCardProps {
  course: Course;
  index: number;
  selected: boolean;
  onSelect: (s: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  getDifficultyLevel: (l: string) => string;
  t: (key: string, opts?: any) => string;
}

const CourseCard: React.FC<CourseCardProps> = ({
  course,
  index,
  selected,
  onSelect,
  onView,
  onEdit,
  getDifficultyLevel,
  t,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    className={cn(
      'group relative flex h-full flex-col overflow-hidden rounded-2xl border shadow-glass',
      'surface-card transition-all duration-300 ease-out',
      'hover:-translate-y-1 hover:shadow-glow',
      selected
        ? 'border-brand-cyan/60 ring-1 ring-brand-cyan/40'
        : !course.published
          ? 'border-dashed border-themed-2'
          : 'border-themed hover:border-brand-cyan/40'
    )}
  >
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/20 to-transparent"
    />

    <div className="flex flex-1 flex-col p-6">
      {/* Top row: checkbox + difficulty + draft | price */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Checkbox checked={selected} onChange={onSelect} />
          <Pill className={difficultyTone(course.difficulty_level)}>
            {getDifficultyLevel(course.difficulty_level)}
          </Pill>
          {!course.published && (
            <Pill className="border-danger-500/40 bg-danger-500/15 text-danger-500">
              <EyeOff className="mr-1 h-2.5 w-2.5" />
              Draft
            </Pill>
          )}
        </div>
        {course.is_free ? (
          <Pill className="border-brand-cyan/40 bg-brand-cyan/10 text-brand-cyan">
            Free
          </Pill>
        ) : (
          <div className="serif-num inline-flex items-baseline gap-0.5 leading-none">
            <IndianRupee
              className="h-3.5 w-3.5 self-center text-brand-gold"
              strokeWidth={2.5}
            />
            <span className="text-[18px] font-semibold text-text">
              {course.price}
            </span>
          </div>
        )}
      </div>

      {/* Title + description */}
      <div className="mb-6">
        <h3
          className={cn(
            'serif-display line-clamp-2 text-[22px] leading-[1.15] tracking-tight',
            !course.published ? 'text-text-dim' : 'text-text'
          )}
        >
          {course.title}
        </h3>
        {course.subtitle && (
          <p className="mt-2 line-clamp-1 text-[13px] leading-relaxed text-text-dim">
            {course.subtitle}
          </p>
        )}
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-text-mute">
          {course.description}
        </p>
      </div>

      {/* Stat strip — single row of 3 with dividers */}
      <div className="mb-6 grid grid-cols-3 divide-x divide-themed rounded-xl border border-themed bg-line/[0.025]">
        <StatCell
          icon={Users}
          label={t('dashboard.students', { defaultValue: 'students' })}
          value={course.enrolled_students_count.toLocaleString()}
        />
        <StatCell
          icon={Clock}
          label="hours"
          value={`${course.duration_in_hours}h`}
        />
        <StatCell
          icon={Layers}
          label={t('dashboard.modules', { defaultValue: 'modules' })}
          value={`${course.modules_count}`}
          accent="gold"
        />
      </div>

      {/* Footer: instructor + actions */}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-themed pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative h-8 w-8 shrink-0">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full bg-brand-grad shadow-[0_4px_12px_-4px_rgba(0,224,255,0.5)]"
            />
            <div className="relative flex h-full w-full items-center justify-center">
              <span className="font-mono text-[11px] font-bold text-white">
                {(course.instructors[0]?.name || '?').charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[9px] font-semibold uppercase tracking-widest2 text-text-mute">
              {t('courses.instructor')}
            </div>
            <div className="truncate text-[13px] font-medium text-text">
              {course.instructors[0]?.name || t('common.noDataAvailable')}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onEdit}
            aria-label={t('common.edit')}
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Eye className="h-3.5 w-3.5" />}
            onClick={onView}
          >
            {t('common.view')}
          </Button>
        </div>
      </div>
    </div>
  </motion.div>
);

const StatCell: React.FC<{
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: 'cyan' | 'gold';
}> = ({ icon: Icon, label, value, accent = 'cyan' }) => (
  <div className="flex flex-col items-center justify-center px-2 py-4">
    <Icon
      className={cn(
        'mb-1.5 h-4 w-4',
        accent === 'gold' ? 'text-brand-gold' : 'text-brand-cyan'
      )}
      strokeWidth={1.75}
    />
    <div className="serif-num text-[18px] font-semibold leading-none text-text">
      {value}
    </div>
    <div className="mt-1.5 font-mono text-[9px] font-semibold uppercase tracking-widest2 text-text-mute">
      {label}
    </div>
  </div>
);

const Meta: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="min-w-0">
    <div className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
      {label}
    </div>
    <div className="mt-0.5 truncate text-text-dim">{children}</div>
  </div>
);

export default Courses;
