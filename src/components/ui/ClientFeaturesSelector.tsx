import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckSquare, Square, Save, Loader2, Check } from 'lucide-react';
import { Feature } from '../../types/client';
import Button from './Button';

interface ClientFeaturesSelectorProps {
  availableFeatures: Feature[];
  currentFeatureIds: number[];
  clientId: number;
  onUpdate: (clientId: number, featureIds: number[]) => Promise<void>;
  isLoading?: boolean;
}

const ClientFeaturesSelector: React.FC<ClientFeaturesSelectorProps> = ({
  availableFeatures,
  currentFeatureIds,
  clientId,
  onUpdate,
  isLoading = false,
}) => {
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<number[]>(currentFeatureIds);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Update selected features when currentFeatureIds change (e.g., when API loads)
  // Use a ref to track previous value and avoid unnecessary updates
  const prevFeatureIdsRef = React.useRef<number[]>(currentFeatureIds);
  
  useEffect(() => {
    // Check if currentFeatureIds actually changed by comparing arrays
    const prevSet = new Set(prevFeatureIdsRef.current);
    const currentSet = new Set(currentFeatureIds);
    const areEqual = 
      prevSet.size === currentSet.size &&
      [...prevSet].every(id => currentSet.has(id));
    
    if (!areEqual) {
      // Update state only if the prop actually changed
      setSelectedFeatureIds([...currentFeatureIds]);
      setHasChanges(false);
      prevFeatureIdsRef.current = [...currentFeatureIds];
    }
  }, [currentFeatureIds]);

  // Check if there are changes between current and selected features
  useEffect(() => {
    const currentSet = new Set(currentFeatureIds);
    const selectedSet = new Set(selectedFeatureIds);
    const hasChanges_ = 
      currentSet.size !== selectedSet.size ||
      ![...currentSet].every(id => selectedSet.has(id));
    setHasChanges(hasChanges_);
  }, [selectedFeatureIds, currentFeatureIds]);

  const handleFeatureToggle = (featureId: number) => {
    setSelectedFeatureIds(prev => {
      if (prev.includes(featureId)) {
        return prev.filter(id => id !== featureId);
      } else {
        return [...prev, featureId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedFeatureIds.length === availableFeatures.length) {
      setSelectedFeatureIds([]);
    } else {
      setSelectedFeatureIds(availableFeatures.map(f => f.id));
    }
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    
    setIsSaving(true);
    try {
      await onUpdate(clientId, selectedFeatureIds);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to update features:', error);
      // Error toast is handled by the API service error handler
      // Revert to current feature IDs on error
      setSelectedFeatureIds(currentFeatureIds);
    } finally {
      setIsSaving(false);
    }
  };

  const isFeatureSelected = (featureId: number) => selectedFeatureIds.includes(featureId);
  const allSelected = availableFeatures.length > 0 && selectedFeatureIds.length === availableFeatures.length;
  const someSelected = selectedFeatureIds.length > 0 && selectedFeatureIds.length < availableFeatures.length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
        <span className="ml-3 text-gray-600">Loading features...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Select All */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Client Features</h3>
          <p className="text-sm text-gray-500 mt-1">
            Select features to enable for this client ({selectedFeatureIds.length} of {availableFeatures.length} selected)
          </p>
        </div>
        {availableFeatures.length > 0 && (
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            {allSelected ? (
              <>
                <CheckSquare className="w-4 h-4" />
                Deselect All
              </>
            ) : (
              <>
                <Square className="w-4 h-4" />
                Select All
              </>
            )}
          </button>
        )}
      </div>

      {/* Features Grid */}
      {availableFeatures.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p>No features available</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableFeatures.map((feature) => {
            const isSelected = isFeatureSelected(feature.id);
            return (
              <motion.label
                key={feature.id}
                htmlFor={`feature-${feature.id}`}
                className={`
                  flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <input
                  type="checkbox"
                  id={`feature-${feature.id}`}
                  checked={isSelected}
                  onChange={() => handleFeatureToggle(feature.id)}
                  className="sr-only"
                />
                <div className={`
                  w-5 h-5 rounded border-2 flex items-center justify-center transition-all flex-shrink-0
                  ${isSelected 
                    ? 'bg-primary-600 border-primary-600 text-white' 
                    : 'bg-white border-gray-300'
                  }
                `}>
                  {isSelected && <Check className="w-4 h-4" />}
                </div>
                <span className={`
                  text-sm font-medium flex-1
                  ${isSelected ? 'text-primary-900' : 'text-gray-900'}
                `}>
                  {feature.name}
                </span>
              </motion.label>
            );
          })}
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end pt-4 border-t border-gray-200"
        >
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isSaving}
            leftIcon={<Save className="w-4 h-4" />}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Features'}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default ClientFeaturesSelector;

