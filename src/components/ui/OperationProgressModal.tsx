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
          <AlertCircle className="w-12 h-12 text-danger-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">Operation Not Found</h3>
          <p className="text-text-mute mb-4">
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
    if (!operation) return <Clock className="w-8 h-8 text-text-mute" />;
    
    switch (operation.status) {
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-emerald-400" />;
      case 'failed':
        return <XCircle className="w-8 h-8 text-danger-500" />;
      case 'in_progress':
        return <Clock className="w-8 h-8 text-brand-cyan animate-spin" />;
      case 'pending':
      default:
        return <Clock className="w-8 h-8 text-text-mute" />;
    }
  };

  const getStatusColor = () => {
    if (!operation) return 'bg-line/[0.05]';
    
    switch (operation.status) {
      case 'completed':
        return 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400';
      case 'failed':
        return 'border border-danger-500/30 bg-danger-500/10 text-danger-500';
      case 'in_progress':
        return 'bg-brand-cyan/10 text-brand-cyan';
      case 'pending':
      default:
        return 'bg-line/[0.05] text-text';
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
          <div className="flex-shrink-0 w-12 h-12 bg-brand-cyan/50 rounded-xl flex items-center justify-center text-white">
            {getOperationIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text">
              Operation ID: {operationId}
            </h3>
            <p className="text-sm text-text-dim">
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
                <div className="text-lg font-medium text-text">
                  {operation?.status ? operation.status.charAt(0).toUpperCase() + operation.status.slice(1) : 'Loading...'}
                </div>
                <div className="text-sm text-text-mute">
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
            <div className="w-full bg-ink-2 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  operation.status === 'completed' ? 'bg-emerald-500/[0.05]0' :
                  operation.status === 'failed' ? 'bg-danger-500/[0.05]0' :
                  'bg-brand-cyan/50'
                }`}
                style={{ width: `${operation.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Success Results */}
        {operation?.status === 'completed' && operation.result_data && (
          <div className="p-4 bg-emerald-500/[0.05] border border-green-200 rounded-lg">
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
          <div className="p-4 bg-danger-500/[0.05] border border-red-200 rounded-lg">
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
            className="text-sm text-brand-cyan hover:text-brand-cyan font-medium"
          >
            {showDetails ? 'Hide Details' : 'Show Details'}
          </button>
          
          {showDetails && operation && (
            <div className="p-4 bg-line/[0.03] rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-text">Created:</span>
                  <p className="text-text-dim">{formatDateTime(operation.created_at)}</p>
                </div>
                {operation.completed_at && (
                  <div>
                    <span className="font-medium text-text">Completed:</span>
                    <p className="text-text-dim">{formatDateTime(operation.completed_at)}</p>
                  </div>
                )}
                <div>
                  <span className="font-medium text-text">Operation Type:</span>
                  <p className="text-text-dim">{operation.operation_type}</p>
                </div>
                <div>
                  <span className="font-medium text-text">Progress:</span>
                  <p className="text-text-dim">{operation.progress}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-themed">
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