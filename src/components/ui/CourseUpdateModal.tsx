import React, { useState, useEffect } from 'react';
import { IndianRupee, Eye, EyeOff, AlertCircle, Settings, UserPlus, UserX, Lock, Unlock, Award, BadgeMinus } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Course Settings">
      <div className="space-y-6">
        {/* Course Info */}
        <div className="flex items-start gap-4 p-4 bg-line/[0.03] rounded-lg">
          <div className="flex-shrink-0 w-12 h-12 bg-brand-cyan/10 rounded-lg flex items-center justify-center">
            <Settings className="w-6 h-6 text-brand-cyan" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text mb-1">{course.title}</h3>
            {course.subtitle && (
              <p className="text-sm text-text-dim mb-2">{course.subtitle}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-text-mute">
              <span>{course.difficulty_level}</span>
              <span>•</span>
              <span>{course.duration_in_hours}h</span>
              <span>•</span>
              <span>{course.enrolled_students_count} enrolled</span>
            </div>
          </div>
        </div>

        {/* Pricing Section */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-text flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-emerald-400" />
            Pricing Settings
          </h4>
          
          {/* Free/Paid Toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="pricing"
                checked={formData.is_free}
                onChange={() => handleFreeToggle(true)}
                className="text-brand-cyan focus:ring-brand-cyan/40"
              />
              <div className="flex-1">
                <div className="font-medium text-text">Free Course</div>
                <div className="text-sm text-text-dim">Make this course available at no cost</div>
              </div>
            </label>
            
            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="pricing"
                checked={!formData.is_free}
                onChange={() => handleFreeToggle(false)}
                className="text-brand-cyan focus:ring-brand-cyan/40 mt-1"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <div className="font-medium text-text">Paid Course</div>
                  <div className="text-sm text-text-dim">Set a price for this course</div>
                </div>
                
                {!formData.is_free && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text">
                      Price (INR)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IndianRupee className="h-4 w-4 text-text-mute" />
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="9999.99"
                        value={formData.price}
                        onChange={(e) => handlePriceChange(e.target.value)}
                        className={`pl-10 ${errors.price ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                        placeholder="0.00"
                      />
                    </div>
                    {errors.price && (
                      <p className="text-sm text-danger-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.price}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>
        </div>

        {/* Publishing Section */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-text flex items-center gap-2">
            {formData.published ? (
              <Eye className="w-5 h-5 text-emerald-400" />
            ) : (
              <EyeOff className="w-5 h-5 text-text-mute" />
            )}
            Publishing Status
          </h4>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="published"
                checked={formData.published}
                onChange={() => setFormData(prev => ({ ...prev, published: true }))}
                className="text-brand-cyan focus:ring-brand-cyan/40"
              />
              <div className="flex-1">
                <div className="font-medium text-text flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-400" />
                  Published
                </div>
                <div className="text-sm text-text-dim">Course is visible and available to students</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="published"
                checked={!formData.published}
                onChange={() => setFormData(prev => ({ ...prev, published: false }))}
                className="text-brand-cyan focus:ring-brand-cyan/40"
              />
              <div className="flex-1">
                <div className="font-medium text-text flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-text-mute" />
                  Unpublished
                </div>
                <div className="text-sm text-text-dim">Course is hidden from students</div>
              </div>
            </label>
          </div>
        </div>

        {/* Enrollment Section */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-text flex items-center gap-2">
            {formData.enrollment_enabled ? (
              <UserPlus className="w-5 h-5 text-emerald-400" />
            ) : (
              <UserX className="w-5 h-5 text-text-mute" />
            )}
            Enrollment Settings
          </h4>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="enrollment"
                checked={formData.enrollment_enabled}
                onChange={() => setFormData(prev => ({ ...prev, enrollment_enabled: true }))}
                className="text-brand-cyan focus:ring-brand-cyan/40"
              />
              <div className="flex-1">
                <div className="font-medium text-text flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  Enrollment Enabled
                </div>
                <div className="text-sm text-text-dim">Students can enroll in this course</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="enrollment"
                checked={!formData.enrollment_enabled}
                onChange={() => setFormData(prev => ({ ...prev, enrollment_enabled: false }))}
                className="text-brand-cyan focus:ring-brand-cyan/40"
              />
              <div className="flex-1">
                <div className="font-medium text-text flex items-center gap-2">
                  <UserX className="w-4 h-4 text-text-mute" />
                  Enrollment Disabled
                </div>
                <div className="text-sm text-text-dim">Students cannot enroll in this course</div>
              </div>
            </label>
          </div>
        </div>

        {/* Content Lock Section */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-text flex items-center gap-2">
            {formData.content_lock_enabled ? (
              <Lock className="w-5 h-5 text-danger-500" />
            ) : (
              <Unlock className="w-5 h-5 text-emerald-400" />
            )}
            Content Lock Settings
          </h4>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="content_lock"
                checked={!formData.content_lock_enabled}
                onChange={() => setFormData(prev => ({ ...prev, content_lock_enabled: false }))}
                className="text-brand-cyan focus:ring-brand-cyan/40"
              />
              <div className="flex-1">
                <div className="font-medium text-text flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-emerald-400" />
                  Content Lock Disabled
                </div>
                <div className="text-sm text-text-dim">All course content is accessible to enrolled students</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="content_lock"
                checked={formData.content_lock_enabled}
                onChange={() => setFormData(prev => ({ ...prev, content_lock_enabled: true }))}
                className="text-brand-cyan focus:ring-brand-cyan/40"
              />
              <div className="flex-1">
                <div className="font-medium text-text flex items-center gap-2">
                  <Lock className="w-4 h-4 text-danger-500" />
                  Content Lock Enabled
                </div>
                <div className="text-sm text-text-dim">Course content is locked and requires unlocking</div>
              </div>
            </label>
          </div>
        </div>

        {/* Certificate Section */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-text flex items-center gap-2">
            {formData.certificate_available ? (
              <Award className="w-5 h-5 text-amber-400" />
            ) : (
              <BadgeMinus className="w-5 h-5 text-text-mute" />
            )}
            Certificate Settings
          </h4>

          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="certificate"
                checked={formData.certificate_available}
                onChange={() => setFormData(prev => ({ ...prev, certificate_available: true }))}
                className="text-brand-cyan focus:ring-brand-cyan/40"
              />
              <div className="flex-1">
                <div className="font-medium text-text flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Certificate Enabled
                </div>
                <div className="text-sm text-text-dim">Students receive a completion certificate</div>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-themed-2">
              <input
                type="radio"
                name="certificate"
                checked={!formData.certificate_available}
                onChange={() => setFormData(prev => ({ ...prev, certificate_available: false }))}
                className="text-brand-cyan focus:ring-brand-cyan/40"
              />
              <div className="flex-1">
                <div className="font-medium text-text flex items-center gap-2">
                  <BadgeMinus className="w-4 h-4 text-text-mute" />
                  Certificate Disabled
                </div>
                <div className="text-sm text-text-dim">No certificate is issued on completion</div>
              </div>
            </label>
          </div>
        </div>

        {/* Summary */}
        {hasChanges && (
          <div className="p-4 bg-brand-cyan/5 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-brand-cyan flex-shrink-0 mt-0.5" />
              <div className="text-sm text-brand-cyan">
                <p className="font-medium mb-1">Summary of Changes:</p>
                <ul className="space-y-1">
                  {formData.is_free !== course.is_free && (
                    <li>• Pricing: {course.is_free ? 'Free' : `₹${course.price}`} → {getCurrentPrice()}</li>
                  )}
                  {formData.price !== parseFloat(course.price) && !formData.is_free && (
                    <li>• Price: ₹{course.price} → ₹{formData.price.toFixed(2)}</li>
                  )}
                  {formData.published !== course.published && (
                    <li>• Status: {course.published ? 'Published' : 'Unpublished'} → {formData.published ? 'Published' : 'Unpublished'}</li>
                  )}
                  {formData.enrollment_enabled !== (course.enrollment_enabled ?? true) && (
                    <li>• Enrollment: {(course.enrollment_enabled ?? true) ? 'Enabled' : 'Disabled'} → {formData.enrollment_enabled ? 'Enabled' : 'Disabled'}</li>
                  )}
                  {formData.content_lock_enabled !== (course.content_lock_enabled ?? false) && (
                    <li>• Content Lock: {(course.content_lock_enabled ?? false) ? 'Enabled' : 'Disabled'} → {formData.content_lock_enabled ? 'Enabled' : 'Disabled'}</li>
                  )}
                  {formData.certificate_available !== (course.certificate_available ?? false) && (
                    <li>• Certificate: {(course.certificate_available ?? false) ? 'Enabled' : 'Disabled'} → {formData.certificate_available ? 'Enabled' : 'Disabled'}</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-themed">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasChanges || Object.keys(errors).length > 0}
            isLoading={isSubmitting}
          >
            {!hasChanges ? 'No Changes' : 'Update Course'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CourseUpdateModal;