import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, Copy, Trash2, Users } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { CourseOperationStatus } from '../../types/client';
import { useOperationStatus } from '../../hooks/useClients';

interface OperationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationId: string;
  operationType: 'duplicate' | 'bulk_duplicate' | 'delete';
  onComplete?: (result: any) => void;
}

const OperationProgressModal: React.FC<OperationProgressModalProps> = ({
  isOpen,
  onClose,
  operationId,
  operationType,
  onComplete
}) => {
  const { data: operation, isLoading } = useOperationStatus(operationId, isOpen);
  const [showDetails, setShowDetails] = useState(false);

  // Call onComplete when operation is finished
  useEffect(() => {
    if (operation?.status === 'completed' && operation.result_data && onComplete) {
      onComplete(operation.result_data);
    }
  }, [operation?.status, operation?.result_data, onComplete]);

  if (!operation && !isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Operation Status">
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Operation Not Found</h3>
          <p className="text-gray-500 mb-4">
            The requested operation could not be found or has expired.
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  const getOperationIcon = () => {
    switch (operationType) {
      case 'duplicate':
        return <Copy className="w-6 h-6" />;
      case 'bulk_duplicate':
        return <Users className="w-6 h-6" />;
      case 'delete':
        return <Trash2 className="w-6 h-6" />;
      default:
        return <Clock className="w-6 h-6" />;
    }
  };

  const getOperationTitle = () => {
    switch (operationType) {
      case 'duplicate':
        return 'Course Duplication';
      case 'bulk_duplicate':
        return 'Bulk Course Duplication';
      case 'delete':
        return 'Course Deletion';
      default:
        return 'Course Operation';
    }
  };

  const getStatusIcon = () => {
    if (!operation) return <Clock className="w-8 h-8 text-gray-400" />;
    
    switch (operation.status) {
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'failed':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'in_progress':
        return <Clock className="w-8 h-8 text-blue-500 animate-spin" />;
      case 'pending':
      default:
        return <Clock className="w-8 h-8 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    if (!operation) return 'bg-gray-100';
    
    switch (operation.status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={getOperationTitle()}>
      <div className="space-y-6">
        {/* Operation Header */}
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center text-white">
            {getOperationIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">
              Operation ID: {operationId}
            </h3>
            <p className="text-sm text-gray-600">
              {operation?.message || 'Loading operation status...'}
            </p>
          </div>
        </div>

        {/* Status and Progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <div>
                <div className="text-lg font-medium text-gray-900">
                  {operation?.status ? operation.status.charAt(0).toUpperCase() + operation.status.slice(1) : 'Loading...'}
                </div>
                <div className="text-sm text-gray-500">
                  {operation?.progress !== undefined ? `${operation.progress}% complete` : 'Checking status...'}
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor()}`}>
              {operation?.status || 'Loading'}
            </span>
          </div>

          {/* Progress Bar */}
          {operation && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  operation.status === 'completed' ? 'bg-green-500' :
                  operation.status === 'failed' ? 'bg-red-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${operation.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Success Results */}
        {operation?.status === 'completed' && operation.result_data && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="text-md font-semibold text-green-900 mb-3">Operation Completed Successfully</h4>
            <div className="space-y-2 text-sm text-green-800">
              {operation.result_data.new_course_id && (
                <p>✅ New Course ID: <span className="font-mono">{operation.result_data.new_course_id}</span></p>
              )}
              {operation.result_data.new_course_title && (
                <p>✅ Course Title: <span className="font-medium">{operation.result_data.new_course_title}</span></p>
              )}
              {operation.result_data.modules_count && (
                <p>✅ Modules Copied: <span className="font-medium">{operation.result_data.modules_count}</span></p>
              )}
              {operation.result_data.content_count && (
                <p>✅ Content Items: <span className="font-medium">{operation.result_data.content_count}</span></p>
              )}
              {operation.result_data.published !== undefined && (
                <p>✅ Status: <span className="font-medium">{operation.result_data.published ? 'Published' : 'Unpublished'}</span></p>
              )}
            </div>
          </div>
        )}

        {/* Error Details */}
        {operation?.status === 'failed' && operation.error_details && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-md font-semibold text-red-900 mb-3">Operation Failed</h4>
            <div className="space-y-2 text-sm text-red-800">
              <p><strong>Error Type:</strong> {operation.error_details.error_type}</p>
              <p><strong>Error Message:</strong> {operation.error_details.error_message}</p>
            </div>
          </div>
        )}

        {/* Operation Details */}
        <div className="space-y-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          
          {showDetails && operation && (
            <div className="p-4 bg-gray-50 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-gray-700">Created:</span>
                  <p className="text-gray-600">{formatDateTime(operation.created_at)}</p>
                </div>
                {operation.completed_at && (
                  <div>
                    <span className="font-medium text-gray-700">Completed:</span>
                    <p className="text-gray-600">{formatDateTime(operation.completed_at)}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700">Operation Type:</span>
                  <p className="text-gray-600">{operation.operation_type}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Progress:</span>
                  <p className="text-gray-600">{operation.progress}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {operation?.status === 'completed' || operation?.status === 'failed' ? (
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  // Force refresh by closing and reopening
                  setShowDetails(false);
                }}
                disabled={isLoading}
              >
                Refresh
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default OperationProgressModal;