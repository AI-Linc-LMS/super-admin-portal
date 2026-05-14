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
                className="h-20 w-20 rounded-full object-cover border-4 border-brand-cyan/30"
                src={admin.profile_pic_url}
                alt={admin.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-20 w-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-4 border-brand-cyan/30 ${admin.profile_pic_url ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-2xl">
                {admin.first_name.charAt(0)}{admin.last_name.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-text mb-1">{admin.name}</h2>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-brand-cyan" />
              <span className="text-sm font-medium text-brand-cyan uppercase tracking-wide">
                {admin.role}
              </span>
            </div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                admin.is_active
                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border border-danger-500/30 bg-danger-500/10 text-danger-500'
              }`}
            >
              {admin.is_active ? 'Active' : 'Inactive'}
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
                  <p className="font-medium text-text">{admin.first_name}</p>
                </div>
                <div>
                  <span className="text-text-mute">Last Name:</span>
                  <p className="font-medium text-text">{admin.last_name}</p>
                </div>
                <div>
                  <span className="text-text-mute">Username:</span>
                  <p className="font-medium text-text">{admin.username}</p>
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
                    {admin.date_of_birth ? formatDate(admin.date_of_birth) : 'Not provided'}
                  </p>
                </div>
                <div>
                  <span className="text-text-mute">Joined Date:</span>
                  <p className="font-medium text-text">{formatDate(admin.created_at)}</p>
                </div>
                <div>
                  <span className="text-text-mute">Last Updated:</span>
                  <p className="font-medium text-text">{formatDate(admin.updated_at)}</p>
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
                  <p className="font-medium text-text break-all">{admin.email}</p>
                </div>
                <div>
                  <span className="text-text-mute">Phone:</span>
                  <p className="font-medium text-text">
                    {admin.phone_number || 'Not provided'}
                  </p>
                </div>
              </div>
            </div>

            {admin.bio && (
              <div className="bg-line/[0.03] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-text-mute" />
                  <span className="text-sm font-medium text-text">Bio</span>
                </div>
                <p className="text-sm text-text">{admin.bio}</p>
              </div>
            )}

            {admin.social_links && Object.keys(admin.social_links).length > 0 && (
              <div className="bg-line/[0.03] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-text-mute" />
                  <span className="text-sm font-medium text-text">Social Links</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(admin.social_links).map(([platform, url]) => (
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

export default AdminDetailsModal;