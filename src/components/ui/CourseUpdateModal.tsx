import React, { useState, useEffect } from 'react';
import { IndianRupee, Eye, EyeOff, AlertCircle, Settings, UserPlus, UserX } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import { ClientCourse } from '../../types/client';

interface CourseUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (courseId: number, courseData: { price?: number; is_free?: boolean; published?: boolean; enrollment_enabled?: boolean }) => Promise<void>;
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
    enrollment_enabled: course.enrollment_enabled ?? true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ price?: string }>({});

  // Reset form when course changes
  useEffect(() => {
    setFormData({
      price: parseFloat(course.price) || 0,
      is_free: course.is_free,
      published: course.published,
      enrollment_enabled: course.enrollment_enabled ?? true
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
      formData.enrollment_enabled !== (course.enrollment_enabled ?? true);

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      
      const updateData: { price?: number; is_free?: boolean; published?: boolean; enrollment_enabled?: boolean } = {};
      
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
    formData.enrollment_enabled !== (course.enrollment_enabled ?? true);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Update Course Settings">
      <div className="space-y-6">
        {/* Course Info */}
        <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0 w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
            <Settings className="w-6 h-6 text-primary-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{course.title}</h3>
            {course.subtitle && (
              <p className="text-sm text-gray-600 mb-2">{course.subtitle}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
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
          <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
            <IndianRupee className="w-5 h-5 text-green-600" />
            Pricing Settings
          </h4>
          
          {/* Free/Paid Toggle */}
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300">
              <input
                type="radio"
                name="pricing"
                checked={formData.is_free}
                onChange={() => handleFreeToggle(true)}
                className="text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900">Free Course</div>
                <div className="text-sm text-gray-600">Make this course available at no cost</div>
              </div>
            </label>
            
            <label className="flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300">
              <input
                type="radio"
                name="pricing"
                checked={!formData.is_free}
                onChange={() => handleFreeToggle(false)}
                className="text-primary-600 focus:ring-primary-500 mt-1"
              />
              <div className="flex-1 space-y-3">
                <div>
                  <div className="font-medium text-gray-900">Paid Course</div>
                  <div className="text-sm text-gray-600">Set a price for this course</div>
                </div>
                
                {!formData.is_free && (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Price (INR)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IndianRupee className="h-4 w-4 text-gray-400" />
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
                      <p className="text-sm text-red-600 flex items-center gap-1">
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
          <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
            {formData.published ? (
              <Eye className="w-5 h-5 text-green-600" />
            ) : (
              <EyeOff className="w-5 h-5 text-gray-400" />
            )}
            Publishing Status
          </h4>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300">
              <input
                type="radio"
                name="published"
                checked={formData.published}
                onChange={() => setFormData(prev => ({ ...prev, published: true }))}
                className="text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-green-600" />
                  Published
                </div>
                <div className="text-sm text-gray-600">Course is visible and available to students</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300">
              <input
                type="radio"
                name="published"
                checked={!formData.published}
                onChange={() => setFormData(prev => ({ ...prev, published: false }))}
                className="text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-gray-400" />
                  Unpublished
                </div>
                <div className="text-sm text-gray-600">Course is hidden from students</div>
              </div>
            </label>
          </div>
        </div>

        {/* Enrollment Section */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
            {formData.enrollment_enabled ? (
              <UserPlus className="w-5 h-5 text-green-600" />
            ) : (
              <UserX className="w-5 h-5 text-gray-400" />
            )}
            Enrollment Settings
          </h4>
          
          <div className="space-y-3">
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300">
              <input
                type="radio"
                name="enrollment"
                checked={formData.enrollment_enabled}
                onChange={() => setFormData(prev => ({ ...prev, enrollment_enabled: true }))}
                className="text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-green-600" />
                  Enrollment Enabled
                </div>
                <div className="text-sm text-gray-600">Students can enroll in this course</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer transition-all hover:border-gray-300">
              <input
                type="radio"
                name="enrollment"
                checked={!formData.enrollment_enabled}
                onChange={() => setFormData(prev => ({ ...prev, enrollment_enabled: false }))}
                className="text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1">
                <div className="font-medium text-gray-900 flex items-center gap-2">
                  <UserX className="w-4 h-4 text-gray-400" />
                  Enrollment Disabled
                </div>
                <div className="text-sm text-gray-600">Students cannot enroll in this course</div>
              </div>
            </label>
          </div>
        </div>

        {/* Summary */}
        {hasChanges && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
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
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
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