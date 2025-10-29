import React from 'react';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Eye,
  EyeOff,
  IndianRupee,
  Check
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface OperationResult {
  courseId: number;
  courseTitle: string;
  success: boolean;
  error?: string;
}

interface BulkOperationProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  operation: 'publish' | 'unpublish' | 'make_free' | 'make_paid';
  price?: number;
  totalCourses: number;
  completedCourses: number;
  results: OperationResult[];
  isComplete: boolean;
  onRetry?: () => void;
}

const BulkOperationProgressModal: React.FC<BulkOperationProgressModalProps> = ({
  isOpen,
  onClose,
  operation,
  price,
  totalCourses,
  completedCourses,
  results,
  isComplete,
  onRetry
}) => {
  const progress = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;
  const successCount = results.filter(r => r.success).length;
  const errorCount = results.filter(r => !r.success).length;

  const getOperationIcon = () => {
    switch (operation) {
      case 'publish':
        return <Eye className="w-5 h-5 text-green-600" />;
      case 'unpublish':
        return <EyeOff className="w-5 h-5 text-gray-600" />;
      case 'make_free':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'make_paid':
        return <IndianRupee className="w-5 h-5 text-orange-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getOperationTitle = () => {
    switch (operation) {
      case 'publish':
        return 'Publishing Courses';
      case 'unpublish':
        return 'Unpublishing Courses';
      case 'make_free':
        return 'Making Courses Free';
      case 'make_paid':
        return 'Making Courses Paid';
      default:
        return 'Processing Courses';
    }
  };

  const getOperationDescription = () => {
    switch (operation) {
      case 'publish':
        return 'Making courses visible to students...';
      case 'unpublish':
        return 'Hiding courses from students...';
      case 'make_free':
        return 'Setting courses as free...';
      case 'make_paid':
        return `Setting courses as paid with price ₹${price?.toFixed(2)}...`;
      default:
        return 'Processing course updates...';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isComplete ? onClose : undefined} title={getOperationTitle()}>
      <div className="space-y-6">
        {/* Progress Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {isComplete ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center"
              >
                {errorCount > 0 ? (
                  <AlertCircle className="w-8 h-8 text-yellow-600" />
                ) : (
                  <CheckCircle className="w-8 h-8 text-green-600" />
                )}
              </motion.div>
            ) : (
              <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
              </div>
            )}
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {isComplete ? (
              errorCount > 0 ? 'Operation Completed with Errors' : 'Operation Completed Successfully'
            ) : (
              getOperationDescription()
            )}
          </h3>
          
          <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
            {getOperationIcon()}
            <span>{completedCourses} of {totalCourses} courses processed</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-primary-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Results Summary */}
        {isComplete && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-4"
          >
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-semibold text-green-800">Successful</span>
              </div>
              <div className="text-2xl font-bold text-green-600">{successCount}</div>
            </div>
            {errorCount > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-red-800">Failed</span>
                </div>
                <div className="text-2xl font-bold text-red-600">{errorCount}</div>
              </div>
            )}
          </motion.div>
        )}

        {/* Detailed Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Course Results</h4>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <motion.div
                  key={result.courseId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    result.success 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${
                      result.success ? 'text-green-800' : 'text-red-800'
                    } truncate`}>
                      {result.courseTitle}
                    </p>
                    {result.error && (
                      <p className="text-xs text-red-600 mt-1">{result.error}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          {isComplete ? (
            <>
              {errorCount > 0 && onRetry && (
                <Button
                  variant="outline"
                  onClick={onRetry}
                >
                  Retry Failed
                </Button>
              )}
              <Button
                variant="primary"
                onClick={onClose}
              >
                Close
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={onClose}
              disabled
            >
              Processing...
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default BulkOperationProgressModal;
