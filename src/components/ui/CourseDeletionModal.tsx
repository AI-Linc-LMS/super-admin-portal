import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, BookOpen, Users, Clock, FileText } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { ClientCourse } from '../../types/client';

interface CourseDeletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (courseId: number, clientId: number) => Promise<void>;
  course: ClientCourse;
  clientId: number;
  isLoading?: boolean;
}

const CourseDeletionModal: React.FC<CourseDeletionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  course,
  clientId,
  isLoading = false
}) => {
  const [confirmationText, setConfirmationText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const requiredText = 'DELETE';
  const isConfirmed = confirmationText === requiredText;

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmationText('');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!isConfirmed) return;

    setIsSubmitting(true);
    try {
      await onConfirm(course.id, clientId);
      onClose();
    } catch (error) {
      console.error('Failed to delete course:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mock deletion summary data (in real implementation, this would come from API)
  const deletionSummary = {
    modules: Math.floor(Math.random() * 10) + 1,
    submodules: Math.floor(Math.random() * 20) + 5,
    content_items: Math.floor(Math.random() * 100) + 20,
    video_tutorials: Math.floor(Math.random() * 50) + 10,
    quizzes: Math.floor(Math.random() * 30) + 5,
    mcq_questions: Math.floor(Math.random() * 100) + 20,
    articles: Math.floor(Math.random() * 15),
    coding_problems: Math.floor(Math.random() * 10),
    assignments: Math.floor(Math.random() * 8),
    comments: Math.floor(Math.random() * 50) + 5,
    enrolled_students: course.enrolled_students_count,
    likes: Math.floor(Math.random() * 20)
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Course">
      <div className="space-y-6">
        {/* Warning Header */}
        <div className="flex items-center gap-3 p-4 bg-danger-500/[0.05] border border-red-200 rounded-lg">
          <AlertTriangle className="w-8 h-8 text-danger-500 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-red-900">Permanent Deletion Warning</h3>
            <p className="text-sm text-danger-500 mt-1">
              This action cannot be undone. All course data will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Course Information */}
        <div className="flex items-start gap-4 p-4 bg-line/[0.03] rounded-lg border">
          <div className="flex-shrink-0 w-12 h-12 bg-danger-500/[0.05]0 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
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
              <span>•</span>
              <span className={`px-2 py-1 rounded text-xs ${
                course.published ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'bg-line/[0.05] text-text'
              }`}>
                {course.published ? 'Published' : 'Unpublished'}
              </span>
            </div>
          </div>
        </div>

        {/* Deletion Summary */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-text flex items-center gap-2">
            <FileText className="w-5 h-5 text-text-dim" />
            Content to be Deleted
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-line/[0.03] rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-text">{deletionSummary.modules}</div>
              <div className="text-xs text-text-dim">Modules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text">{deletionSummary.submodules}</div>
              <div className="text-xs text-text-dim">Submodules</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text">{deletionSummary.content_items}</div>
              <div className="text-xs text-text-dim">Content Items</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text">{deletionSummary.video_tutorials}</div>
              <div className="text-xs text-text-dim">Videos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text">{deletionSummary.quizzes}</div>
              <div className="text-xs text-text-dim">Quizzes</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-text">{deletionSummary.mcq_questions}</div>
              <div className="text-xs text-text-dim">Questions</div>
            </div>
          </div>

          {/* Student Impact */}
          {deletionSummary.enrolled_students > 0 && (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Users className="w-5 h-5 text-amber-600" />
              <div className="text-sm text-amber-800">
                <strong>{deletionSummary.enrolled_students} enrolled students</strong> will lose access to this course and all their progress will be deleted.
              </div>
            </div>
          )}
        </div>

        {/* Confirmation Input */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Type <span className="font-mono font-bold text-danger-500">{requiredText}</span> to confirm deletion:
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                confirmationText && !isConfirmed
                  ? 'border-red-300 focus:ring-red-500 bg-danger-500/[0.05]'
                  : isConfirmed
                  ? 'border-green-300 focus:ring-green-500 bg-emerald-500/[0.05]'
                  : 'border-themed-2 focus:ring-blue-500'
              }`}
              placeholder={`Type "${requiredText}" to confirm`}
              disabled={isSubmitting}
            />
            {confirmationText && !isConfirmed && (
              <p className="text-xs text-danger-500 mt-1">
                Please type "{requiredText}" exactly as shown.
              </p>
            )}
          </div>
        </div>

        {/* Final Warning */}
        <div className="flex items-start gap-3 p-4 bg-danger-500/[0.05] border border-red-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-danger-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">
            <p className="font-medium mb-1">Final Warning:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>This action is irreversible and cannot be undone</li>
              <li>All course content and student progress will be permanently deleted</li>
              <li>Enrolled students will immediately lose access to the course</li>
              <li>Course analytics and completion data will be lost</li>
              <li>This operation may take 1-3 minutes to complete</li>
            </ul>
          </div>
        </div>

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
            variant="danger"
            onClick={handleSubmit}
            disabled={!isConfirmed || isSubmitting}
            isLoading={isSubmitting}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            {isSubmitting ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CourseDeletionModal;