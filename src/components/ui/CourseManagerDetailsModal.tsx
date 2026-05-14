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
                className="h-20 w-20 rounded-full object-cover border-4 border-brand-cyan/30"
                src={courseManager.profile_pic_url}
                alt={courseManager.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-20 w-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-4 border-brand-cyan/30 ${courseManager.profile_pic_url ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-2xl">
                {courseManager.first_name.charAt(0)}{courseManager.last_name.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text mb-1">{courseManager.name}</h2>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-brand-gold" />
              <span className="text-sm font-medium text-brand-gold uppercase tracking-wide">
                {courseManager.role}
              </span>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                courseManager.is_active
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border border-danger-500/30 bg-danger-500/10 text-danger-500'
              }`}
            >
              {courseManager.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-line/[0.03] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-text-mute" />
                <span className="text-sm font-medium text-text">Personal Information</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-text-mute">First Name:</span>
                  <p className="font-medium text-text">{courseManager.first_name}</p>
                </div>
                <div>
                  <span className="text-text-mute">Last Name:</span>
                  <p className="font-medium text-text">{courseManager.last_name}</p>
                </div>
                <div>
                  <span className="text-text-mute">Username:</span>
                  <p className="font-medium text-text">{courseManager.username}</p>
                </div>
              </div>
            </div>

            <div className="bg-line/[0.03] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-text-mute" />
                <span className="text-sm font-medium text-text">Dates</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-text-mute">Date of Birth:</span>
                  <p className="font-medium text-text">
                    {courseManager.date_of_birth ? formatDate(courseManager.date_of_birth) : 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-text-mute">Joined Date:</span>
                  <p className="font-medium text-text">{formatDate(courseManager.created_at)}</p>
                </div>
                <div>
                  <span className="text-text-mute">Last Updated:</span>
                  <p className="font-medium text-text">{formatDate(courseManager.updated_at)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-line/[0.03] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="w-4 h-4 text-text-mute" />
                <span className="text-sm font-medium text-text">Contact Information</span>
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-text-mute">Email:</span>
                  <p className="font-medium text-text break-all">{courseManager.email}</p>
                </div>
                <div>
                  <span className="text-text-mute">Phone:</span>
                  <p className="font-medium text-text">
                    {courseManager.phone_number || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            {courseManager.bio && (
              <div className="bg-line/[0.03] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-text-mute" />
                  <span className="text-sm font-medium text-text">Bio</span>
                </div>
                <p className="text-sm text-text">{courseManager.bio}</p>
              </div>
            )}

            {courseManager.social_links && Object.keys(courseManager.social_links).length > 0 && (
              <div className="bg-line/[0.03] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-text-mute" />
                  <span className="text-sm font-medium text-text">Social Links</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(courseManager.social_links).map(([platform, url]) => (
                    <div key={platform} className="text-sm">
                      <span className="text-text-mute capitalize">{platform}:</span>
                      <a
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-brand-cyan hover:text-primary-800 break-all"
                      >
                        {url as string}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {courseManager.managed_courses && courseManager.managed_courses.length > 0 && (
              <div className="bg-line/[0.03] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ClipboardList className="w-4 h-4 text-text-mute" />
                  <span className="text-sm font-medium text-text">
                    Managed Courses ({courseManager.managed_courses_count || courseManager.managed_courses.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {courseManager.managed_courses.map((course) => (
                    <div key={course.id} className="text-sm p-2 bg-ink-1/60 rounded border border-themed">
                      <p className="font-medium text-text">{course.title}</p>
                      <p className="text-text-mute text-xs">Slug: {course.slug}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-themed">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CourseManagerDetailsModal;

