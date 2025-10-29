import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Eye, 
  EyeOff, 
  IndianRupee,
  Settings,
  Check,
  X
} from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import { Course } from '../../types/course';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCourses: Course[];
  onConfirm: (operation: 'publish' | 'unpublish' | 'make_free' | 'make_paid', price?: number) => Promise<void>;
  isLoading?: boolean;
}

interface OperationResult {
  courseId: number;
  courseTitle: string;
  success: boolean;
  error?: string;
}

const BulkOperationsModal: React.FC<BulkOperationsModalProps> = ({
  isOpen,
  onClose,
  selectedCourses,
  onConfirm,
  isLoading = false
}) => {
  const [selectedOperation, setSelectedOperation] = useState<'publish' | 'unpublish' | 'make_free' | 'make_paid' | null>(null);
  const [price, setPrice] = useState<number>(0);
  const [showPriceInput, setShowPriceInput] = useState(false);
  const [operationResults, setOperationResults] = useState<OperationResult[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const operations = [
    {
      id: 'publish' as const,
      title: 'Publish Courses',
      description: 'Make selected courses visible to students',
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      id: 'unpublish' as const,
      title: 'Unpublish Courses',
      description: 'Hide selected courses from students',
      icon: EyeOff,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    },
    {
      id: 'make_free' as const,
      title: 'Make Courses Free',
      description: 'Set selected courses as free',
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      id: 'make_paid' as const,
      title: 'Make Courses Paid',
      description: 'Set selected courses as paid with a price',
      icon: IndianRupee,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  const handleOperationSelect = (operation: 'publish' | 'unpublish' | 'make_free' | 'make_paid') => {
    setSelectedOperation(operation);
    setShowPriceInput(operation === 'make_paid');
    if (operation !== 'make_paid') {
      setPrice(0);
    }
  };

  const handleConfirm = async () => {
    if (!selectedOperation) return;
    
    if (selectedOperation === 'make_paid' && price <= 0) {
      return;
    }

    try {
      setIsExecuting(true);
      setOperationResults([]);
      
      await onConfirm(selectedOperation, selectedOperation === 'make_paid' ? price : undefined);
      
      // Reset form
      setSelectedOperation(null);
      setPrice(0);
      setShowPriceInput(false);
      onClose();
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  const getOperationSummary = () => {
    if (!selectedOperation) return '';
    
    const operation = operations.find(op => op.id === selectedOperation);
    return `${operation?.title} (${selectedCourses.length} courses)`;
  };

  const canConfirm = selectedOperation && (selectedOperation !== 'make_paid' || price > 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Course Operations">
      <div className="space-y-6">
        {/* Selected Courses Summary */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-blue-900">Selected Courses</h3>
          </div>
          <p className="text-sm text-blue-800 mb-3">
            {selectedCourses.length} course{selectedCourses.length !== 1 ? 's' : ''} selected for bulk operation
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedCourses.map((course) => (
              <div key={course.id} className="text-sm text-blue-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0" />
                <span className="truncate">{course.title}</span>
                <span className="text-blue-500 text-xs">
                  ({course.published ? 'Published' : 'Unpublished'}, {course.is_free ? 'Free' : 'Paid'})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Operation Selection */}
        <div className="space-y-4">
          <h4 className="text-lg font-semibold text-gray-900">Choose Operation</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {operations.map((operation) => {
              const Icon = operation.icon;
              const isSelected = selectedOperation === operation.id;
              
              return (
                <motion.button
                  key={operation.id}
                  onClick={() => handleOperationSelect(operation.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected 
                      ? `${operation.borderColor} ${operation.bgColor} ring-2 ring-primary-500` 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${operation.bgColor}`}>
                      <Icon className={`w-5 h-5 ${operation.color}`} />
                    </div>
                    <div className="flex-1">
                      <h5 className="font-medium text-gray-900 mb-1">{operation.title}</h5>
                      <p className="text-sm text-gray-600">{operation.description}</p>
                    </div>
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Price Input for Paid Courses */}
        <AnimatePresence>
          {showPriceInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3"
            >
              <h4 className="text-md font-semibold text-gray-900">Set Price for Paid Courses</h4>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="9999.99"
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
              <p className="text-sm text-gray-600">
                All selected courses will be set to this price
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Operation Summary */}
        {selectedOperation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              <h4 className="font-medium text-gray-900">Operation Summary</h4>
            </div>
            <p className="text-sm text-gray-700">
              You are about to <strong>{getOperationSummary().toLowerCase()}</strong>
              {selectedOperation === 'make_paid' && price > 0 && (
                <span> with a price of <strong>₹{price.toFixed(2)}</strong></span>
              )}
              . This action will be applied to all {selectedCourses.length} selected courses.
            </p>
          </motion.div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!canConfirm || isExecuting}
            isLoading={isExecuting}
          >
            {isExecuting ? 'Processing...' : 'Apply to Selected Courses'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkOperationsModal;
