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
                className="h-16 w-16 rounded-full object-cover border-2 border-gray-200"
                src={student.profile_pic_url}
                alt={student.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-16 w-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-2 border-gray-200 ${student.profile_pic_url ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-xl">
                {student.first_name.charAt(0)}{student.last_name.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
            <p className="text-gray-600">Student ID: #{student.id}</p>
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
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <User className="w-5 h-5 mr-2" />
            Personal Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">First Name</label>
              <p className="mt-1 text-sm text-gray-900">{student.first_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Last Name</label>
              <p className="mt-1 text-sm text-gray-900">{student.last_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Username</label>
              <p className="mt-1 text-sm text-gray-900">{student.username}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">User ID</label>
              <p className="mt-1 text-sm text-gray-900">#{student.user_id}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2" />
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Email Address</label>
              <p className="mt-1 text-sm text-gray-900 break-words">{student.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone Number</label>
              <p className="mt-1 text-sm text-gray-900">
                {student.phone_number ? (
                  <span className="flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    {student.phone_number}
                  </span>
                ) : (
                  <span className="text-gray-400">Not provided</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Additional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Role</label>
              <p className="mt-1 text-sm text-gray-900 capitalize flex items-center">
                <Shield className="w-4 h-4 mr-1" />
                {student.role}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
              <p className="mt-1 text-sm text-gray-900">
                {student.date_of_birth ? (
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(student.date_of_birth)}
                  </span>
                ) : (
                  <span className="text-gray-400">Not provided</span>
                )}
              </p>
            </div>
          </div>
          
          {student.bio && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-500">Bio</label>
              <p className="mt-1 text-sm text-gray-900 bg-white p-3 rounded border">
                {student.bio}
              </p>
            </div>
          )}
        </div>

        {/* Social Links */}
        {student.social_links && Object.keys(student.social_links).length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Globe className="w-5 h-5 mr-2" />
              Social Links
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(student.social_links).map(([platform, url]) => (
                <div key={platform} className="flex items-center">
                  <span className="text-sm font-medium text-gray-500 capitalize w-20">
                    {platform}:
                  </span>
                  <a
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary-600 hover:text-primary-800 truncate"
                  >
                    {url as string}
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Account Information */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Account Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Account Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(student.created_at)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Last Updated</label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDate(student.updated_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            onClick={onClose}
          >
            Close
          </button>
          <button
            type="button"
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Edit Student
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentDetailsModal;