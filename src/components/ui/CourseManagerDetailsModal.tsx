import React from 'react';
import { X, User, Mail, Phone, Calendar, BookOpen, ClipboardList } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { formatDate } from '../../utils/helpers';
import { CourseManager } from '../../types/client';

interface CourseManagerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  courseManager: CourseManager;
}

const CourseManagerDetailsModal: React.FC<CourseManagerDetailsModalProps> = ({
  isOpen,
  onClose,
  courseManager,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Course Manager Details">
      <div className="space-y-6">
        {/* Header with Avatar */}
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {courseManager.profile_pic_url ? (
              <img
                className="h-20 w-20 rounded-full object-cover border-4 border-primary-100"
                src={courseManager.profile_pic_url}
                alt={courseManager.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-20 w-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-4 border-primary-100 ${courseManager.profile_pic_url ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-2xl">
                {courseManager.first_name.charAt(0)}{courseManager.last_name.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{courseManager.name}</h2>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-600 uppercase tracking-wide">
                {courseManager.role}
              </span>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                courseManager.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {courseManager.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Personal Information</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">First Name:</span>
                  <p className="font-medium text-gray-900">{courseManager.first_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Last Name:</span>
                  <p className="font-medium text-gray-900">{courseManager.last_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Username:</span>
                  <p className="font-medium text-gray-900">{courseManager.username}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Dates</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Date of Birth:</span>
                  <p className="font-medium text-gray-900">
                    {courseManager.date_of_birth ? formatDate(courseManager.date_of_birth) : 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Joined Date:</span>
                  <p className="font-medium text-gray-900">{formatDate(courseManager.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <p className="font-medium text-gray-900">{formatDate(courseManager.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Contact Information</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Email:</span>
                  <p className="font-medium text-gray-900 break-all">{courseManager.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium text-gray-900">
                    {courseManager.phone_number || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            {courseManager.bio && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Bio</span>
                </div>
                <p className="text-sm text-gray-900">{courseManager.bio}</p>
              </div>
            )}

            {courseManager.social_links && Object.keys(courseManager.social_links).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Social Links</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(courseManager.social_links).map(([platform, url]) => (
                    <div key={platform} className="text-sm">
                      <span className="text-gray-500 capitalize">{platform}:</span>
                      <a
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-primary-600 hover:text-primary-800 break-all"
                      >
                        {url as string}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {courseManager.managed_courses && courseManager.managed_courses.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Managed Courses ({courseManager.managed_courses_count || courseManager.managed_courses.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {courseManager.managed_courses.map((course) => (
                    <div key={course.id} className="text-sm p-2 bg-white rounded border border-gray-200">
                      <p className="font-medium text-gray-900">{course.title}</p>
                      <p className="text-gray-500 text-xs">Slug: {course.slug}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CourseManagerDetailsModal;

