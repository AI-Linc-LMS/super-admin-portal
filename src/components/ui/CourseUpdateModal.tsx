import React, { useState, useEffect } from 'react';
import {
  IndianRupee,
  Eye,
  EyeOff,
  AlertCircle,
  Settings,
  UserPlus,
  UserX,
  Lock,
  Unlock,
  Award,
  BadgeMinus,
  Sparkles,
  Check,
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { cn } from '../../utils/helpers';
import { ClientCourse } from '../../types/client';

interface CourseUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (courseId: number, courseData: { price?: number; is_free?: boolean; published?: boolean; enrollment_enabled?: boolean; content_lock_enabled?: boolean; certificate_available?: boolean }) => Promise<void>;
  course: ClientCourse;
  isLoading?: boolean;
}

const CourseUpdateModal: React.FC<CourseUpdateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  course,
  isLoading = false
}) => {
  const [formData, setFormData] = useState({
    price: parseFloat(course.price) || 0,
    is_free: course.is_free,
    published: course.published,
    enrollment_enabled: course.enrollment_enabled ?? true,
    content_lock_enabled: course.content_lock_enabled ?? false,
    certificate_available: course.certificate_available ?? false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ price?: string }>({});

  // Reset form when course changes
  useEffect(() => {
    setFormData({
      price: parseFloat(course.price) || 0,
      is_free: course.is_free,
      published: course.published,
      enrollment_enabled: course.enrollment_enabled ?? true,
      content_lock_enabled: course.content_lock_enabled ?? false,
      certificate_available: course.certificate_available ?? false
    });
    setErrors({});
  }, [course]);

  const validateForm = () => {
    const newErrors: { price?: string } = {};
    
    if (!formData.is_free && formData.price < 0) {
      newErrors.price = 'Price cannot be negative';
    }
    
    if (!formData.is_free && formData.price > 9999.99) {
      newErrors.price = 'Price cannot exceed ₹9,999.99';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const hasChanges =
      formData.price !== parseFloat(course.price) ||
      formData.is_free !== course.is_free ||
      formData.published !== course.published ||
      formData.enrollment_enabled !== (course.enrollment_enabled ?? true) ||
      formData.content_lock_enabled !== (course.content_lock_enabled ?? false) ||
      formData.certificate_available !== (course.certificate_available ?? false);

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);

      const updateData: { price?: number; is_free?: boolean; published?: boolean; enrollment_enabled?: boolean; content_lock_enabled?: boolean; certificate_available?: boolean } = {};
      
      // Only include changed fields
      if (formData.is_free !== course.is_free) {
        updateData.is_free = formData.is_free;
      }
      
      if (formData.published !== course.published) {
        updateData.published = formData.published;
      }
      
      if (formData.enrollment_enabled !== (course.enrollment_enabled ?? true)) {
        updateData.enrollment_enabled = formData.enrollment_enabled;
      }
      
      if (formData.content_lock_enabled !== (course.content_lock_enabled ?? false)) {
        updateData.content_lock_enabled = formData.content_lock_enabled;
      }

      if (formData.certificate_available !== (course.certificate_available ?? false)) {
        updateData.certificate_available = formData.certificate_available;
      }

      // Handle price changes
      if (formData.is_free) {
        // If switching to free, set price to 0
        if (!course.is_free) {
          updateData.price = 0;
        }
      } else {
        // If not free, update price if changed
        if (formData.price !== parseFloat(course.price)) {
          updateData.price = formData.price;
        }
      }

      await onConfirm(course.id, updateData);
      onClose();
    } catch (error) {
      console.error('Failed to update course:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePriceChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setFormData(prev => ({ ...prev, price: numValue }));
    
    // Clear price error when user starts typing
    if (errors.price) {
      setErrors(prev => ({ ...prev, price: undefined }));
    }
  };

  const handleFreeToggle = (isFree: boolean) => {
    setFormData(prev => ({ 
      ...prev, 
      is_free: isFree,
      // When switching to free, reset price to 0
      price: isFree ? 0 : prev.price
    }));
  };

  const getCurrentPrice = () => {
    if (formData.is_free) return 'Free';
    return formData.price > 0 ? `₹${formData.price.toFixed(2)}` : 'Free';
  };

  const hasChanges =
    formData.price !== parseFloat(course.price) ||
    formData.is_free !== course.is_free ||
    formData.published !== course.published ||
    formData.enrollment_enabled !== (course.enrollment_enabled ?? true) ||
    formData.content_lock_enabled !== (course.content_lock_enabled ?? false) ||
    formData.certificate_available !== (course.certificate_available ?? false);

  // Count of changed fields for the summary ribbon
  const changeCount =
    (formData.is_free !== course.is_free ? 1 : 0) +
    (!formData.is_free && formData.price !== parseFloat(course.price) ? 1 : 0) +
    (formData.published !== course.published ? 1 : 0) +
    (formData.enrollment_enabled !== (course.enrollment_enabled ?? true) ? 1 : 0) +
    (formData.content_lock_enabled !== (course.content_lock_enabled ?? false) ? 1 : 0) +
    (formData.certificate_available !== (course.certificate_available ?? false) ? 1 : 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Course Settings">
      <div className="space-y-7">
        {/* Course header — gradient bracket, kicker, meta pills */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-xl border border-brand-cyan/15 p-4"
          style={{
            background:
              'radial-gradient(ellipse 70% 60% at 0% 0%, rgba(35,86,214,0.10), transparent 60%),' +
              'radial-gradient(ellipse 50% 60% at 100% 100%, rgba(0,224,255,0.07), transparent 65%),' +
              'rgba(10,18,40,0.30)',
          }}
        >
          {/* faint grid texture */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px),' +
                'linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)',
              backgroundSize: '16px 16px',
              mixBlendMode: 'overlay',
            }}
          />
          <div className="relative flex items-start gap-4">
            <div
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl"
              style={{
                background:
                  'linear-gradient(135deg, #00e0ff 0%, #2356d6 100%)',
                boxShadow: '0 8px 24px -10px rgba(0,224,255,0.55)',
              }}
            >
              <Settings className="h-6 w-6" style={{ color: '#05070f' }} />
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em]"
                style={{
                  background: 'linear-gradient(90deg, #2356d6 0%, #00e0ff 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                }}
              >
                Editing course
              </span>
              <h3 className="serif-display mt-1 text-[20px] leading-[1.15] text-text">
                {course.title}
              </h3>
              {course.subtitle ? (
                <p className="mt-1 line-clamp-1 text-[13px] text-text-dim">{course.subtitle}</p>
              ) : null}
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                {course.difficulty_level ? (
                  <MetaPill label={course.difficulty_level} />
                ) : null}
                <MetaPill label={`${course.duration_in_hours}h`} />
                <MetaPill label={`${course.enrolled_students_count} enrolled`} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Pricing (full-width because of the conditional price input) */}
        <SettingsSection
          delay={0.04}
          accent="#34d399"
          icon={<IndianRupee className="h-3.5 w-3.5" style={{ color: '#05070f' }} />}
          kicker="Pricing"
          title="How learners pay for this course"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <OptionCard
              accent="#34d399"
              active={formData.is_free}
              onClick={() => handleFreeToggle(true)}
              title="Free"
              description="Available at no cost"
              icon={<IndianRupee className="h-3.5 w-3.5" />}
            />
            <OptionCard
              accent="#34d399"
              active={!formData.is_free}
              onClick={() => handleFreeToggle(false)}
              title="Paid"
              description="Set a price below"
              icon={<IndianRupee className="h-3.5 w-3.5" />}
            />
          </div>
          {!formData.is_free && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="mt-3"
            >
              <label className="mb-1.5 block font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-text-mute">
                Price (INR)
              </label>
              <div className="relative">
                <IndianRupee className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-mute" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="9999.99"
                  value={formData.price}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className={cn('pl-10', errors.price && 'border-danger-500/50 focus:border-danger-500 focus:ring-danger-500/30')}
                  placeholder="0.00"
                />
              </div>
              {errors.price ? (
                <p className="mt-1.5 flex items-center gap-1 text-[12px] text-danger-500">
                  <AlertCircle className="h-3.5 w-3.5" /> {errors.price}
                </p>
              ) : null}
            </motion.div>
          )}
        </SettingsSection>

        {/* Publishing */}
        <SettingsSection
          delay={0.08}
          accent="#34d399"
          icon={<Eye className="h-3.5 w-3.5" style={{ color: '#05070f' }} />}
          kicker="Visibility"
          title="Who can see this course"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <OptionCard
              accent="#34d399"
              active={formData.published}
              onClick={() => setFormData(prev => ({ ...prev, published: true }))}
              title="Published"
              description="Visible to learners"
              icon={<Eye className="h-3.5 w-3.5" />}
            />
            <OptionCard
              accent="#94a3b8"
              active={!formData.published}
              onClick={() => setFormData(prev => ({ ...prev, published: false }))}
              title="Unpublished"
              description="Hidden from learners"
              icon={<EyeOff className="h-3.5 w-3.5" />}
            />
          </div>
        </SettingsSection>

        {/* Enrollment */}
        <SettingsSection
          delay={0.12}
          accent="#00e0ff"
          icon={<UserPlus className="h-3.5 w-3.5" style={{ color: '#05070f' }} />}
          kicker="Enrollment"
          title="Whether new learners can join"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <OptionCard
              accent="#00e0ff"
              active={formData.enrollment_enabled}
              onClick={() => setFormData(prev => ({ ...prev, enrollment_enabled: true }))}
              title="Open"
              description="Learners can enroll"
              icon={<UserPlus className="h-3.5 w-3.5" />}
            />
            <OptionCard
              accent="#94a3b8"
              active={!formData.enrollment_enabled}
              onClick={() => setFormData(prev => ({ ...prev, enrollment_enabled: false }))}
              title="Closed"
              description="No new enrolments"
              icon={<UserX className="h-3.5 w-3.5" />}
            />
          </div>
        </SettingsSection>

        {/* Content Lock */}
        <SettingsSection
          delay={0.16}
          accent={formData.content_lock_enabled ? '#ff5a6a' : '#34d399'}
          icon={
            formData.content_lock_enabled ? (
              <Lock className="h-3.5 w-3.5" style={{ color: '#05070f' }} />
            ) : (
              <Unlock className="h-3.5 w-3.5" style={{ color: '#05070f' }} />
            )
          }
          kicker="Content lock"
          title="Sequential unlock of modules"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <OptionCard
              accent="#34d399"
              active={!formData.content_lock_enabled}
              onClick={() => setFormData(prev => ({ ...prev, content_lock_enabled: false }))}
              title="Unlocked"
              description="All content accessible"
              icon={<Unlock className="h-3.5 w-3.5" />}
            />
            <OptionCard
              accent="#ff5a6a"
              active={formData.content_lock_enabled}
              onClick={() => setFormData(prev => ({ ...prev, content_lock_enabled: true }))}
              title="Locked"
              description="Unlocks as learner progresses"
              icon={<Lock className="h-3.5 w-3.5" />}
            />
          </div>
        </SettingsSection>

        {/* Certificate */}
        <SettingsSection
          delay={0.2}
          accent="#ffd166"
          icon={<Award className="h-3.5 w-3.5" style={{ color: '#05070f' }} />}
          kicker="Certificate"
          title="Completion award"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            <OptionCard
              accent="#ffd166"
              active={formData.certificate_available}
              onClick={() => setFormData(prev => ({ ...prev, certificate_available: true }))}
              title="Issue certificate"
              description="On 100% completion"
              icon={<Award className="h-3.5 w-3.5" />}
            />
            <OptionCard
              accent="#94a3b8"
              active={!formData.certificate_available}
              onClick={() => setFormData(prev => ({ ...prev, certificate_available: false }))}
              title="No certificate"
              description="Disable for this course"
              icon={<BadgeMinus className="h-3.5 w-3.5" />}
            />
          </div>
        </SettingsSection>

        {/* Diff summary — gradient ribbon with before → after pills */}
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-xl border border-brand-cyan/25 p-4"
            style={{
              background:
                'radial-gradient(circle at 0% 0%, rgba(0,224,255,0.12), transparent 60%),' +
                'linear-gradient(135deg, rgba(35,86,214,0.12), rgba(0,224,255,0.04))',
            }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-brand-cyan" />
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em] text-brand-cyan">
                {changeCount} change{changeCount === 1 ? '' : 's'} pending
              </span>
            </div>
            <ul className="space-y-1.5">
              {formData.is_free !== course.is_free && (
                <DiffRow label="Pricing"
                  oldValue={course.is_free ? 'Free' : `₹${course.price}`}
                  newValue={getCurrentPrice()} />
              )}
              {formData.price !== parseFloat(course.price) && !formData.is_free && (
                <DiffRow label="Price"
                  oldValue={`₹${course.price}`}
                  newValue={`₹${formData.price.toFixed(2)}`} />
              )}
              {formData.published !== course.published && (
                <DiffRow label="Visibility"
                  oldValue={course.published ? 'Published' : 'Unpublished'}
                  newValue={formData.published ? 'Published' : 'Unpublished'} />
              )}
              {formData.enrollment_enabled !== (course.enrollment_enabled ?? true) && (
                <DiffRow label="Enrollment"
                  oldValue={(course.enrollment_enabled ?? true) ? 'Open' : 'Closed'}
                  newValue={formData.enrollment_enabled ? 'Open' : 'Closed'} />
              )}
              {formData.content_lock_enabled !== (course.content_lock_enabled ?? false) && (
                <DiffRow label="Content lock"
                  oldValue={(course.content_lock_enabled ?? false) ? 'Locked' : 'Unlocked'}
                  newValue={formData.content_lock_enabled ? 'Locked' : 'Unlocked'} />
              )}
              {formData.certificate_available !== (course.certificate_available ?? false) && (
                <DiffRow label="Certificate"
                  oldValue={(course.certificate_available ?? false) ? 'Issued' : 'Disabled'}
                  newValue={formData.certificate_available ? 'Issued' : 'Disabled'} />
              )}
            </ul>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap justify-end gap-3 border-t border-themed pt-5">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChanges || Object.keys(errors).length > 0}
            className="group relative inline-flex items-center gap-2 rounded-md px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.22em] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            style={{
              color: '#05070f',
              background: hasChanges
                ? 'linear-gradient(90deg, #00e0ff 0%, #2356d6 100%)'
                : 'rgba(255,255,255,0.08)',
              boxShadow: hasChanges ? '0 6px 20px -8px rgba(0,224,255,0.55)' : undefined,
            }}
          >
            {isSubmitting ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {!hasChanges ? 'No changes' : isSubmitting ? 'Saving…' : `Apply ${changeCount} change${changeCount === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/** Pill chip used for course metadata (difficulty, duration, enrolled count). */
const MetaPill: React.FC<{ label: string }> = ({ label }) => (
  <span className="inline-flex items-center rounded-full border border-themed-2 bg-line/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest2 text-text-dim">
    {label}
  </span>
);

/** Section wrapper — gradient badge + kicker + title + body. */
const SettingsSection: React.FC<{
  accent: string;
  icon: React.ReactNode;
  kicker: string;
  title: string;
  delay?: number;
  children: React.ReactNode;
}> = ({ accent, icon, kicker, title, delay = 0, children }) => (
  <motion.section
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
  >
    <div className="mb-3 flex items-start gap-3">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, rgba(35,86,214,0.9) 100%)`,
          boxShadow: `0 6px 18px -8px ${accent}`,
        }}
      >
        {icon}
      </span>
      <div>
        <p
          className="font-mono text-[10px] font-semibold uppercase tracking-[0.28em]"
          style={{ color: accent }}
        >
          {kicker}
        </p>
        <h4 className="mt-0.5 text-[14px] font-semibold text-text">{title}</h4>
      </div>
    </div>
    {children}
  </motion.section>
);

/** Radio-card option used inside each SettingsSection's 2-col grid. */
const OptionCard: React.FC<{
  active: boolean;
  onClick: () => void;
  title: string;
  description: string;
  accent: string;
  icon: React.ReactNode;
}> = ({ active, onClick, title, description, accent, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'group relative flex items-start gap-3 rounded-lg border p-3 text-left transition-all',
      active
        ? 'shadow-[inset_0_0_0_1px_var(--accent-color)]'
        : 'border-themed-2 hover:border-themed bg-line/[0.02]',
    )}
    style={
      active
        ? ({
            // CSS custom prop so the inset shadow can reuse the accent.
            ['--accent-color' as any]: `${accent}66`,
            borderColor: `${accent}66`,
            background: `linear-gradient(135deg, ${accent}10, ${accent}03)`,
          } as React.CSSProperties)
        : undefined
    }
  >
    <span
      className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md transition"
      style={
        active
          ? {
              background: `linear-gradient(135deg, ${accent} 0%, rgba(35,86,214,0.9) 100%)`,
              color: '#05070f',
              boxShadow: `0 4px 14px -6px ${accent}`,
            }
          : {
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgb(154,163,192)',
            }
      }
    >
      {icon}
    </span>
    <div className="min-w-0 flex-1">
      <p className={cn('text-[13px] font-semibold', active ? 'text-text' : 'text-text-dim')}>
        {title}
      </p>
      <p className="mt-0.5 text-[12px] leading-relaxed text-text-mute">{description}</p>
    </div>
    {active ? (
      <span
        className="absolute right-2.5 top-2.5 grid h-4 w-4 place-items-center rounded-full"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, rgba(35,86,214,0.9) 100%)`,
        }}
      >
        <Check className="h-2.5 w-2.5" style={{ color: '#05070f' }} strokeWidth={3} />
      </span>
    ) : null}
  </button>
);

/** Single before → after row in the diff ribbon. */
const DiffRow: React.FC<{ label: string; oldValue: string; newValue: string }> = ({
  label,
  oldValue,
  newValue,
}) => (
  <li className="flex flex-wrap items-center gap-2 text-[12px]">
    <span className="font-mono text-[10px] uppercase tracking-widest2 text-text-mute min-w-[88px]">
      {label}
    </span>
    <span className="rounded-md border border-themed-2 bg-line/[0.04] px-2 py-0.5 font-mono text-[11px] text-text-dim line-through decoration-text-mute/50">
      {oldValue}
    </span>
    <ArrowRight className="h-3 w-3 text-brand-cyan" />
    <span
      className="rounded-md border px-2 py-0.5 font-mono text-[11px]"
      style={{
        borderColor: 'rgba(0,224,255,0.35)',
        background: 'rgba(0,224,255,0.08)',
        color: '#00e0ff',
      }}
    >
      {newValue}
    </span>
  </li>
);

export default CourseUpdateModal;