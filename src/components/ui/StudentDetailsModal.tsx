import React from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Clock, 
  Shield, 
  Activity,
  UserCheck,
  UserX,
  Globe
} from 'lucide-react';
import Modal from '../ui/Modal';
import { Student } from '../../types/client';
import { formatDate, getStatusColor } from '../../utils/helpers';

interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
}

const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  isOpen,
  onClose,
  student,
}) => {
  if (!student) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Student Details"
      size="lg"
    >
      <div className="space-y-6">
        {/* Student Header */}
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {student.profile_pic_url ? (
              <img
                className="h-16 w-16 rounded-full object-cover border-2 border-themed"
                src={student.profile_pic_url}
                alt={student.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-2 border-themed ${student.profile_pic_url ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-xl">
                {student.first_name.charAt(0)}{student.last_name.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text">{student.name}</h2>
            <p className="text-text-dim">Student ID: #{student.id}</p>
            <div className="mt-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                  student.is_active ? 'active' : 'inactive'
                )}`}
              >
                {student.is_active ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-1" />
                    Active
                  </>
                ) : (
                  <>
                    <UserX className="w-4 h-4 mr-1" />
                    Inactive
                  </>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div className="bg-line/[0.03] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-mute">First Name</label>
              <p className="mt-1 text-sm text-text">{student.first_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mute">Last Name</label>
              <p className="mt-1 text-sm text-text">{student.last_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mute">Username</label>
              <p className="mt-1 text-sm text-text">{student.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mute">User ID</label>
              <p className="mt-1 text-sm text-text">#{student.user_id}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-line/[0.03] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-mute">Email Address</label>
              <p className="mt-1 text-sm text-text break-words">{student.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mute">Phone Number</label>
              <p className="mt-1 text-sm text-text">
                {student.phone_number ? (
                  <span className="flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {student.phone_number}
                  </span>
                ) : (
                  <span className="text-text-mute">Not provided</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-line/[0.03] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Additional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-mute">Role</label>
              <p className="mt-1 text-sm text-text capitalize flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                {student.role}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mute">Date of Birth</label>
              <p className="mt-1 text-sm text-text">
                {student.date_of_birth ? (
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(student.date_of_birth)}
                  </span>
                ) : (
                  <span className="text-text-mute">Not provided</span>
                )}
              </p>
            </div>
          </div>
          
          {student.bio && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-text-mute">Bio</label>
              <p className="mt-1 text-sm text-text bg-ink-1/60 p-3 rounded border">
                {student.bio}
              </p>
            </div>
          )}
        </div>

        {/* Social Links */}
        {student.social_links && Object.keys(student.social_links).length > 0 && (
          <div className="bg-line/[0.03] rounded-lg p-4">
            <h3 className="text-lg font-semibold text-text mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Social Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(student.social_links).map(([platform, url]) => (
                <div key={platform} className="flex items-center">
                  <span className="text-sm font-medium text-text-mute capitalize w-20">
                    {platform}:
                  </span>
                  <a
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-brand-cyan hover:text-primary-800 truncate"
                  >
                    {url as string}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account Information */}
        <div className="bg-line/[0.03] rounded-lg p-4">
          <h3 className="text-lg font-semibold text-text mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-mute">Account Created</label>
              <p className="mt-1 text-sm text-text">
                {formatDate(student.created_at)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-mute">Last Updated</label>
              <p className="mt-1 text-sm text-text">
                {formatDate(student.updated_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-themed">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-text bg-ink-1/60 border border-themed-2 rounded-md hover:bg-line/[0.03] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-cyan/40"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-brand-cyan border border-transparent rounded-md hover:bg-brand-cyan/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-cyan/40"
          >
            Edit Student
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentDetailsModal;