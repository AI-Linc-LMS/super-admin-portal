import React, { useState, useEffect } from 'react';
import { Copy, ArrowRight, AlertCircle, Users, BookOpen } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { ClientCourse } from '../../types/client';
import { useClients } from '../../hooks/useClients';

interface CourseDuplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (courseId: number, fromClientId: number, toClientId: number) => Promise<void>;
  course: ClientCourse;
  currentClientId: number;
  isLoading?: boolean;
}

const CourseDuplicationModal: React.FC<CourseDuplicationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  course,
  currentClientId,
  isLoading = false
}) => {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { data: clients } = useClients();

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedClientId(null);
    }
  }, [isOpen]);

  const availableClients = clients?.filter(client => 
    client.id !== currentClientId && client.is_active !== false
  ) || [];

  const handleSubmit = async () => {
    if (!selectedClientId) return;

    setIsSubmitting(true);
    try {
      await onConfirm(course.id, currentClientId, selectedClientId);
      onClose();
    } catch (error) {
      console.error('Failed to duplicate course:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedClient = clients?.find(client => client.id === selectedClientId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Duplicate Course">
      <div className="space-y-6">
        {/* Course Information */}
        <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{course.title}</h3>
            {course.subtitle && (
              <p className="text-sm text-gray-600 mb-2">{course.subtitle}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>{course.difficulty_level}</span>
              <span>•</span>
              <span>{course.duration_in_hours}h</span>
              <span>•</span>
              <span>{course.enrolled_students_count} enrolled</span>
              <span>•</span>
              <span className={`px-2 py-1 rounded text-xs ${
                course.is_free ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {course.is_free ? 'Free' : 'Paid'}
              </span>
            </div>
          </div>
        </div>

        {/* Client Selection */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-gray-900 flex items-center gap-2">
            <Copy className="w-5 h-5 text-blue-600" />
            Select Destination Client
          </h4>
          
          {availableClients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Available Clients</h3>
              <p className="text-gray-500">
                There are no other active clients available for course duplication.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableClients.map((client) => (
                <label
                  key={client.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedClientId === client.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="destinationClient"
                    value={client.id}
                    checked={selectedClientId === client.id}
                    onChange={() => setSelectedClientId(client.id)}
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {client.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{client.name}</div>
                      <div className="text-xs text-gray-500">
                        {client.total_students} students • {client.total_courses} courses
                      </div>
                    </div>
                    {selectedClientId === client.id && (
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Duplication Flow Visualization */}
        {selectedClient && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h5 className="text-sm font-medium text-gray-900 mb-3">Duplication Summary</h5>
            <div className="flex items-center justify-between">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                  <BookOpen className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-xs text-gray-600">Source</div>
                <div className="text-sm font-medium">Current Client</div>
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400" />
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                  <Copy className="w-6 h-6 text-green-600" />
                </div>
                <div className="text-xs text-gray-600">Destination</div>
                <div className="text-sm font-medium">{selectedClient.name}</div>
              </div>
            </div>
          </div>
        )}

        {/* Warning */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">Important Notes:</p>
            <ul className="text-xs space-y-1 list-disc list-inside">
              <li>The duplicated course will be unpublished by default</li>
              <li>Course content, structure, and settings will be copied</li>
              <li>Student enrollments and progress will not be copied</li>
              <li>This operation may take 2-5 minutes to complete</li>
            </ul>
          </div>
        </div>

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
            disabled={!selectedClientId || isSubmitting || availableClients.length === 0}
            isLoading={isSubmitting}
            leftIcon={<Copy className="w-4 h-4" />}
          >
            {isSubmitting ? 'Duplicating...' : 'Duplicate Course'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CourseDuplicationModal;