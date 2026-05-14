import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import { Copy, Users } from 'lucide-react';
import { useClients } from '../../hooks/useClients';

interface BulkDuplicateCoursesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (destinationClientId: number) => Promise<void>;
  selectedCourses: Array<{ id: number; title: string }>;
  currentClientId: number;
  isLoading?: boolean;
}

const BulkDuplicateCoursesModal: React.FC<BulkDuplicateCoursesModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  selectedCourses,
  currentClientId,
  isLoading = false,
}) => {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: clients } = useClients();

  useEffect(() => {
    if (isOpen) setSelectedClientId(null);
  }, [isOpen]);

  const availableClients = clients?.filter(client => client.id !== currentClientId && client.is_active !== false) || [];

  const handleSubmit = async () => {
    if (!selectedClientId) return;
    setIsSubmitting(true);
    try {
      await onConfirm(selectedClientId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Bulk Duplicate Courses">
      <div className="space-y-6">
        <div className="p-4 bg-brand-cyan/5 rounded-lg mb-2">
          <div className="text-brand-cyan font-medium mb-1">{selectedCourses.length} courses will be duplicated</div>
          <ul className="list-disc list-inside text-xs text-brand-cyan">
            {selectedCourses.slice(0, 5).map(c => (
              <li key={c.id}>{c.title}</li>
            ))}
            {selectedCourses.length > 5 && <li>+ {selectedCourses.length - 5} more</li>}
          </ul>
        </div>
        <div className="space-y-4">
          <h4 className="text-md font-semibold flex items-center gap-2 text-text">
            <Copy className="w-5 h-5 text-brand-cyan" />
            Select Destination Client
          </h4>
          {availableClients.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-text-mute mx-auto mb-4" />
              <h3 className="text-lg font-medium text-text mb-2">No Available Clients</h3>
              <p className="text-text-mute">There are no other active clients available.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableClients.map(client => (
                <label
                  key={client.id}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${selectedClientId === client.id ? 'border-blue-500 bg-brand-cyan/5' : 'border-themed hover:border-themed-2 hover:bg-line/[0.03]'}`}
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
                      <span className="text-white font-bold text-sm">{client.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-text">{client.name}</div>
                      <div className="text-xs text-text-mute">{client.total_students} students • {client.total_courses} courses</div>
                    </div>
                    {selectedClientId === client.id && (
                      <div className="w-5 h-5 bg-brand-cyan/50 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-ink-1/60 rounded-full"></div>
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-themed">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!selectedClientId || isSubmitting || availableClients.length === 0}
            isLoading={isSubmitting || isLoading}
            leftIcon={<Copy className="w-4 h-4" />}
          >
            {isSubmitting ? 'Duplicating...' : 'Duplicate Courses'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default BulkDuplicateCoursesModal;
