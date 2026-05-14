import React from 'react';
import {
  BookOpen,
  Users,
  Clock,
  Eye,
  EyeOff,
  Award,
  User,
  Layers,
  IndianRupee,
  Calendar,
  LucideIcon,
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import CourseManagerAssignment from './CourseManagerAssignment';
import { ClientCourse, CourseManager } from '../../types/client';
import {
  formatDate,
  formatCurrency,
  getDifficultyColor,
  cn,
} from '../../utils/helpers';

interface CourseDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: ClientCourse;
  clientId?: number;
  courseManagers?: CourseManager[];
  onCourseManagerUpdate?: () => void;
}

const CourseDetailsModal: React.FC<CourseDetailsModalProps> = ({
  isOpen,
  onClose,
  course,
  clientId,
  courseManagers = [],
  onCourseManagerUpdate,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Course Details" size="xl">
      <div className="space-y-7">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-xl border border-themed-2">
          <div
            aria-hidden
            className="absolute inset-0 bg-brand-grad-soft"
          />
          <div
            aria-hidden
            className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-brand-cyan/15 blur-3xl"
          />
          <div
            aria-hidden
            className="absolute -left-20 bottom-0 h-32 w-44 rounded-full bg-brand-blue/20 blur-3xl"
          />

          <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
            <div className="relative h-16 w-16 shrink-0">
              <div
                aria-hidden
                className="absolute inset-0 rounded-2xl bg-brand-grad shadow-[0_18px_50px_-15px_rgba(0,224,255,0.55)]"
              />
              <div className="relative flex h-full w-full items-center justify-center">
                <BookOpen className="h-7 w-7 text-white" strokeWidth={1.75} />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-brand-cyan">
                Course · #{course.id}
              </span>
              <h3 className="serif-display mt-1.5 text-[26px] leading-tight text-text">
                {course.title}
              </h3>
              {course.subtitle && (
                <p className="mt-2 text-[14px] leading-relaxed text-text-dim">
                  {course.subtitle}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Pill className={getDifficultyColor(course.difficulty_level)}>
                  {course.difficulty_level}
                </Pill>
                <Pill
                  className={
                    course.published
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border border-danger-500/30 bg-danger-500/10 text-danger-500'
                  }
                >
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
                <Pill
                  className={
                    course.is_free
                      ? 'border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan'
                      : 'border border-brand-gold/30 bg-brand-gold/10 text-brand-gold'
                  }
                >
                  {course.is_free ? 'Free' : `₹${course.price}`}
                </Pill>
              </div>
            </div>
          </div>
        </div>

        {/* Stats — Dashboard-style icon wells */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile
            label="Enrolled"
            value={course.enrolled_students_count.toLocaleString()}
            icon={Users}
            tone="primary"
          />
          <StatTile
            label="Duration"
            value={`${course.duration_in_hours}h`}
            icon={Clock}
            tone="secondary"
          />
          <StatTile
            label="Modules"
            value={course.modules_count || 'N/A'}
            icon={Layers}
            tone="accent"
          />
          <StatTile
            label="Certificate"
            value={course.certificate_available ? 'Yes' : 'No'}
            icon={Award}
            tone={course.certificate_available ? 'primary' : 'mute'}
          />
        </div>

        {/* Description */}
        {course.description && (
          <Section kicker="Overview" title="About this course">
            <p className="text-[14px] leading-relaxed text-text-dim">
              {course.description}
            </p>
          </Section>
        )}

        {/* Instructors */}
        {course.instructors && course.instructors.length > 0 && (
          <Section
            kicker="Faculty"
            title={`Instructor${course.instructors.length > 1 ? 's' : ''}`}
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {course.instructors.map((instructor, index) => (
                <div
                  key={instructor.id || index}
                  className="flex items-start gap-3 rounded-lg border border-themed bg-line/[0.03] p-3"
                >
                  <div className="relative h-10 w-10 shrink-0">
                    <div
                      aria-hidden
                      className="absolute inset-0 rounded-full bg-brand-grad opacity-90"
                    />
                    <div className="relative flex h-full w-full items-center justify-center">
                      <User className="h-4 w-4 text-white" strokeWidth={1.75} />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-medium text-text">
                      {instructor.name}
                    </div>
                    {instructor.bio && (
                      <div className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-text-dim">
                        {instructor.bio}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Course Manager Assignment */}
        {clientId && (
          <CourseManagerAssignment
            course={course}
            clientId={clientId}
            courseManagers={courseManagers}
            onSuccess={onCourseManagerUpdate}
          />
        )}

        {/* Course information + pricing in two columns */}
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Section kicker="Identity" title="Course information">
            <dl className="space-y-2.5">
              <Row label="Course ID">
                <span className="font-mono text-brand-cyan">#{course.id}</span>
              </Row>
              <Row label="Slug">
                <span className="font-mono text-text">{course.slug}</span>
              </Row>
              <Row label="Difficulty">
                <Pill className={getDifficultyColor(course.difficulty_level)}>
                  {course.difficulty_level}
                </Pill>
              </Row>
              <Row label="Status">
                <Pill
                  className={
                    course.published
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                      : 'border border-danger-500/30 bg-danger-500/10 text-danger-500'
                  }
                >
                  {course.published ? 'Published' : 'Unpublished'}
                </Pill>
              </Row>
            </dl>
          </Section>

          <Section kicker="Timeline · Pricing" title="Dates & pricing">
            <dl className="space-y-2.5">
              <Row label="Created">
                <span className="inline-flex items-center gap-1.5 text-text">
                  <Calendar className="h-3.5 w-3.5 text-text-mute" />
                  {formatDate(course.created_at)}
                </span>
              </Row>
              <Row label="Updated">
                <span className="inline-flex items-center gap-1.5 text-text">
                  <Calendar className="h-3.5 w-3.5 text-text-mute" />
                  {formatDate(course.updated_at)}
                </span>
              </Row>
              <Row label="Pricing">
                <Pill
                  className={
                    course.is_free
                      ? 'border border-brand-cyan/30 bg-brand-cyan/10 text-brand-cyan'
                      : 'border border-brand-gold/30 bg-brand-gold/10 text-brand-gold'
                  }
                >
                  {course.is_free ? 'Free' : 'Paid'}
                </Pill>
              </Row>
              {!course.is_free && (
                <Row label="Price">
                  <span className="inline-flex items-center gap-1 font-mono text-[14px] font-medium text-brand-gold">
                    <IndianRupee className="h-3.5 w-3.5" />
                    {formatCurrency(parseFloat(course.price))}
                  </span>
                </Row>
              )}
            </dl>
          </Section>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-themed pt-5">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
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

const StatTile: React.FC<{
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: 'primary' | 'secondary' | 'accent' | 'mute';
}> = ({ label, value, icon: Icon, tone }) => {
  const toneMap = {
    primary: {
      grad: 'bg-brand-grad',
      glow: 'shadow-[0_0_30px_-10px_rgba(35,86,214,0.5)]',
    },
    secondary: {
      grad: 'bg-gradient-to-br from-brand-cyan to-brand-blue',
      glow: 'shadow-[0_0_30px_-10px_rgba(0,224,255,0.5)]',
    },
    accent: {
      grad: 'bg-gradient-to-br from-brand-gold to-[#ffb845]',
      glow: 'shadow-[0_0_30px_-10px_rgba(255,198,109,0.5)]',
    },
    mute: { grad: 'bg-ink-3', glow: '' },
  } as const;
  const t = toneMap[tone];
  return (
    <div className="relative overflow-hidden rounded-xl border border-themed surface-card p-4 shadow-glass">
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/15 to-transparent"
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
            {label}
          </p>
          <p className="serif-num mt-1.5 text-[24px] font-medium leading-none text-text">
            {value}
          </p>
        </div>
        <div
          className={cn(
            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            t.grad,
            t.glow
          )}
        >
          <Icon className="h-4 w-4 text-white" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  );
};

const Section: React.FC<{
  kicker?: string;
  title: string;
  children: React.ReactNode;
}> = ({ kicker, title, children }) => (
  <div className="relative overflow-hidden rounded-xl border border-themed surface-card p-5 shadow-glass">
    <span
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/15 to-transparent"
    />
    {kicker && (
      <span className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-brand-cyan">
        {kicker}
      </span>
    )}
    <h4 className="mt-1.5 mb-4 text-[15px] font-semibold text-text">{title}</h4>
    {children}
  </div>
);

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="flex items-center justify-between gap-3 text-[13px]">
    <dt className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute">
      {label}
    </dt>
    <dd className="text-text">{children}</dd>
  </div>
);

export default CourseDetailsModal;
