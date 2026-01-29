import React, { useState } from 'react';
import { User, Shield, ShieldCheck, UserCheck, AlertTriangle, BookOpen } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { Student, Admin, SuperAdmin, CourseManager } from '../../types/client';

interface ChangeRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: number, newRole: string) => Promise<void>;
  user: Student | Admin | SuperAdmin | CourseManager;
  clientId: number;
  isLoading?: boolean;
}

const ROLE_CONFIGS = {
  student: {
    label: 'Student',
    icon: User,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    description: 'Can access courses and learning materials'
  },
  course_manager: {
    label: 'Course Manager',
    icon: BookOpen,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    description: 'Can manage courses, content, and course-related settings'
  },
  admin: {
    label: 'Admin',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    description: 'Can manage courses, students, and client content'
  },
  superadmin: {
    label: 'SuperAdmin',
    icon: ShieldCheck,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    description: 'Full access to all client features and settings'
  }
} as const;

const ChangeRoleModal: React.FC<ChangeRoleModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  user,
  clientId,
  isLoading = false
}) => {
  const [selectedRole, setSelectedRole] = useState<string>(user.role);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedRole === user.role) {
      onClose();
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(user.user_id, selectedRole);
      onClose();
    } catch (error) {
      console.error('Failed to change role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRoleConfig = ROLE_CONFIGS[user.role as keyof typeof ROLE_CONFIGS];
  const selectedRoleConfig = ROLE_CONFIGS[selectedRole as keyof typeof ROLE_CONFIGS];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change User Role">
      <div className="space-y-6">
        {/* User Info */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex-shrink-0">
            {user.profile_pic_url ? (
              <img
                className="h-12 w-12 rounded-full object-cover border-2 border-gray-200"
                src={user.profile_pic_url}
                alt={user.name}
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center border-2 border-gray-200 ${user.profile_pic_url ? 'hidden' : ''}`}>
              <span className="text-white font-bold text-lg">
                {user.first_name.charAt(0)}{user.last_name.charAt(0)}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
            <p className="text-sm text-gray-600">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              {currentRoleConfig && (
                <>
                  <currentRoleConfig.icon className={`w-4 h-4 ${currentRoleConfig.color}`} />
                  <span className={`text-sm font-medium ${currentRoleConfig.color}`}>
                    Current: {currentRoleConfig.label}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Important:</p>
            <p>Changing a user's role will immediately update their permissions and access level within this client's system.</p>
          </div>
        </div>

        {/* Role Selection */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Select New Role:</h4>
          <div className="space-y-2">
            {Object.entries(ROLE_CONFIGS).map(([roleKey, config]) => (
              <label
                key={roleKey}
                className={`flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedRole === roleKey
                    ? `${config.bgColor} ${config.borderColor}`
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={roleKey}
                  checked={selectedRole === roleKey}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <config.icon className={`w-5 h-5 ${config.color}`} />
                    <span className={`font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    {roleKey === user.role && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{config.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Role Change Summary */}
        {selectedRole !== user.role && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">Role Change Summary</span>
            </div>
            <div className="text-sm text-blue-800">
              <p>
                <strong>{user.name}</strong> will be changed from{' '}
                <strong>{currentRoleConfig?.label}</strong> to{' '}
                <strong>{selectedRoleConfig?.label}</strong>
              </p>
              <p className="mt-1">{selectedRoleConfig?.description}</p>
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
            disabled={isSubmitting || selectedRole === user.role}
            isLoading={isSubmitting}
          >
            {selectedRole === user.role ? 'No Changes' : 'Change Role'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ChangeRoleModal;