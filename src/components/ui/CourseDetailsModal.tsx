import React from 'react';
import { 
  BookOpen, 
  Users, 
  Clock, 
  Star, 
  IndianRupee, 
  Eye, 
  EyeOff, 
  Award,
  Calendar,
  User,
  X
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import CourseManagerAssignment from './CourseManagerAssignment';
import { ClientCourse, CourseManager } from '../../types/client';
import { formatDate, formatCurrency, getDifficultyColor, getStatusColor } from '../../utils/helpers';

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
  onCourseManagerUpdate
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Course Details">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg">
          <div className="flex-shrink-0 w-16 h-16 bg-primary-500 rounded-xl flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h3>
            {course.subtitle && (
              <p className="text-gray-700 mb-3">{course.subtitle}</p>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(course.difficulty_level)}`}>
                {course.difficulty_level}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(course.published ? 'published' : 'unpublished')}`}>
                {course.published ? (
                  <>
                    <Eye className="w-4 h-4 mr-1" />
                    Published
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 mr-1" />
                    Unpublished
                  </>
                )}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                course.is_free 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                <IndianRupee className="w-4 h-4 mr-1" />
                {course.is_free ? 'Free' : formatCurrency(parseFloat(course.price))}
              </span>
            </div>
          </div>
        </div>

        {/* Course Description */}
        {course.description && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-2">Description</h4>
            <p className="text-gray-700 leading-relaxed">{course.description}</p>
          </div>
        )}

        {/* Course Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-2">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{course.enrolled_students_count}</div>
            <div className="text-sm text-gray-600">Enrolled Students</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-2">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{course.duration_in_hours}h</div>
            <div className="text-sm text-gray-600">Duration</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-2">
              <Star className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{course.modules_count || 'N/A'}</div>
            <div className="text-sm text-gray-600">Modules</div>
          </div>
          
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <div className="flex justify-center mb-2">
              <Award className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {course.certificate_available ? 'Yes' : 'No'}
            </div>
            <div className="text-sm text-gray-600">Certificate</div>
          </div>
        </div>

        {/* Instructors */}
        {course.instructors && course.instructors.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <User className="w-5 h-5" />
              Instructor{course.instructors.length > 1 ? 's' : ''}
            </h4>
            <div className="space-y-2">
              {course.instructors.map((instructor, index) => (
                <div key={instructor.id || index} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{instructor.name}</div>
                    {instructor.bio && (
                      <div className="text-sm text-gray-600">{instructor.bio}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
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

        {/* Course Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Course Information</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Course ID:</span>
                <span className="font-medium text-gray-900">#{course.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Slug:</span>
                <span className="font-medium text-gray-900 font-mono text-sm">{course.slug}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Difficulty:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(course.difficulty_level)}`}>
                  {course.difficulty_level}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(course.published ? 'published' : 'unpublished')}`}>
                  {course.published ? 'Published' : 'Unpublished'}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900">Dates & Pricing</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span className="font-medium text-gray-900">{formatDate(course.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Updated:</span>
                <span className="font-medium text-gray-900">{formatDate(course.updated_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Price Type:</span>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  course.is_free 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {course.is_free ? 'Free' : 'Paid'}
                </span>
              </div>
              {!course.is_free && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Price:</span>
                  <span className="font-medium text-gray-900">{formatCurrency(parseFloat(course.price))}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CourseDetailsModal;