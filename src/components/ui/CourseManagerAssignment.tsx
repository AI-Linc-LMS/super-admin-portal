import React, { useState } from 'react';
import { UserPlus, UserX, User, Loader2 } from 'lucide-react';
import Button from './Button';
import { ClientCourse, CourseManager } from '../../types/client';
import { useAssignCourseManager, useUnassignCourseManager } from '../../hooks/useClients';
import toast from 'react-hot-toast';

interface CourseManagerAssignmentProps {
  course: ClientCourse;
  clientId: number;
  courseManagers?: CourseManager[];
  onSuccess?: () => void;
}

const CourseManagerAssignment: React.FC<CourseManagerAssignmentProps> = ({
  course,
  clientId,
  courseManagers = [],
  onSuccess
}) => {
  const [selectedManagerId, setSelectedManagerId] = useState<number | null>(
    course.course_manager?.id || null
  );
  const [isEditing, setIsEditing] = useState(false);

  const assignMutation = useAssignCourseManager();
  const unassignMutation = useUnassignCourseManager();

  const currentManager = course.course_manager;
  const isLoading = assignMutation.isPending || unassignMutation.isPending;

  const handleAssign = async () => {
    // Allow null to unassign via POST
    try {
      const response = await assignMutation.mutateAsync({
        clientId,
        courseId: course.id,
        userProfileId: selectedManagerId
      });

      toast.success(response.message || (selectedManagerId ? 'Course manager assigned successfully' : 'Course manager unassigned successfully'));
      setIsEditing(false);
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to assign course manager';
      toast.error(errorMessage);
    }
  };

  const handleUnassign = async () => {
    try {
      const response = await unassignMutation.mutateAsync({
        clientId,
        courseId: course.id
      });

      toast.success(response.message || 'Course manager unassigned successfully');
      setSelectedManagerId(null);
      setIsEditing(false);
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to unassign course manager';
      toast.error(errorMessage);
    }
  };

  const handleCancel = () => {
    setSelectedManagerId(course.course_manager?.id || null);
    setIsEditing(false);
  };

  const availableManagers = courseManagers.filter(cm => cm.is_active);

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {currentManager ? (
            <User className="w-5 h-5 text-primary-600" />
          ) : (
            <UserX className="w-5 h-5 text-gray-400" />
          )}
          Course Manager
        </h4>
        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
            disabled={isLoading}
          >
            {currentManager ? 'Change' : 'Assign'}
          </Button>
        )}
      </div>

      {!isEditing ? (
        // Display Mode
        <div>
          {currentManager ? (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  {currentManager.name 
                    ? currentManager.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                    : currentManager.email 
                    ? currentManager.email.charAt(0).toUpperCase()
                    : 'CM'}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{currentManager.name || 'Course Manager'}</div>
                  <div className="text-sm text-gray-600">{currentManager.email || 'No email'}</div>
                  {currentManager.username && (
                    <div className="text-xs text-gray-500">@{currentManager.username}</div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-4 border border-dashed border-gray-300 text-center">
              <UserX className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">No course manager assigned</p>
            </div>
          )}
        </div>
      ) : (
        // Edit Mode
        <div className="space-y-4">
          {availableManagers.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
              <UserX className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm text-yellow-800">No active course managers available for this client</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Course Manager
              </label>
              <select
                value={selectedManagerId || ''}
                onChange={(e) => setSelectedManagerId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                disabled={isLoading}
              >
                <option value="">-- No Course Manager --</option>
                {availableManagers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} ({manager.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2">
            {currentManager && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleUnassign}
                disabled={isLoading}
                className="flex items-center gap-2"
              >
                {isLoading && unassignMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserX className="w-4 h-4" />
                )}
                Unassign
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleAssign}
              disabled={isLoading || (currentManager?.id && selectedManagerId === currentManager.id)}
              className="flex items-center gap-2"
            >
              {isLoading && assignMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : selectedManagerId ? (
                <UserPlus className="w-4 h-4" />
              ) : (
                <UserX className="w-4 h-4" />
              )}
              {!selectedManagerId && currentManager
                ? 'Unassign'
                : selectedManagerId && currentManager
                ? 'Change'
                : selectedManagerId
                ? 'Assign'
                : 'No Selection'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagerAssignment;

