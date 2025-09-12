import React from 'react';
import { X, User, Mail, Phone, Calendar, Shield } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { formatDate } from '../../utils/helpers';
import { Admin } from '../../types/client';

interface AdminDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  admin: Admin;
}

const AdminDetailsModal: React.FC<AdminDetailsModalProps> = ({
  isOpen,
  onClose,
  admin,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Admin Details">
      <div className="space-y-6">
        {/* Header with Avatar */}
        <div className="flex items-center space-x-4">
          <div className="flex-shrink-0">
            {admin.profile_pic_url ? (
              <img
                className="h-20 w-20 rounded-full object-cover border-4 border-primary-100"
                src={admin.profile_pic_url}
                alt={admin.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-20 w-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-4 border-primary-100 ${admin.profile_pic_url ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-2xl">
                {admin.first_name.charAt(0)}{admin.last_name.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{admin.name}</h2>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-primary-600" />
              <span className="text-sm font-medium text-primary-600 uppercase tracking-wide">
                {admin.role}
              </span>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                admin.is_active
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {admin.is_active ? 'Active' : 'Inactive'}
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
                  <p className="font-medium text-gray-900">{admin.first_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Last Name:</span>
                  <p className="font-medium text-gray-900">{admin.last_name}</p>
                </div>
                <div>
                  <span className="text-gray-500">Username:</span>
                  <p className="font-medium text-gray-900">{admin.username}</p>
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
                    {admin.date_of_birth ? formatDate(admin.date_of_birth) : 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-500">Joined Date:</span>
                  <p className="font-medium text-gray-900">{formatDate(admin.created_at)}</p>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <p className="font-medium text-gray-900">{formatDate(admin.updated_at)}</p>
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
                  <p className="font-medium text-gray-900 break-all">{admin.email}</p>
                </div>
                <div>
                  <span className="text-gray-500">Phone:</span>
                  <p className="font-medium text-gray-900">
                    {admin.phone_number || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            {admin.bio && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Bio</span>
                </div>
                <p className="text-sm text-gray-900">{admin.bio}</p>
              </div>
            )}

            {admin.social_links && Object.keys(admin.social_links).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Social Links</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(admin.social_links).map(([platform, url]) => (
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

export default AdminDetailsModal;