import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Power, PowerOff, Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

export interface StatusToggleProps {
  isActive: boolean;
  onToggle: (newStatus: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

const StatusToggle: React.FC<StatusToggleProps> = ({
  isActive,
  onToggle,
  disabled = false,
  size = 'md',
  showLabels = true,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    try {
      await onToggle(!isActive);
    } catch (error) {
      console.error('Status toggle error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-5 w-9',
    md: 'h-6 w-11', 
    lg: 'h-7 w-13',
  };

  const thumbClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const iconClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {showLabels && (
        <span className={cn(
          'text-sm font-medium transition-colors',
          isActive ? 'text-green-700' : 'text-gray-500'
        )}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      )}
      
      <button
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2',
          sizeClasses[size],
          isActive 
            ? 'bg-green-500 focus:ring-green-500' 
            : 'bg-gray-200 focus:ring-gray-400',
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed'
        )}
        role="switch"
        aria-checked={isActive}
        aria-label={`Toggle status: currently ${isActive ? 'active' : 'inactive'}`}
      >
        <motion.span
          animate={{
            x: isActive ? (size === 'sm' ? 16 : size === 'md' ? 20 : 24) : 0,
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 flex items-center justify-center',
            thumbClasses[size]
          )}
        >
          {isLoading ? (
            <Loader2 className={cn('animate-spin text-gray-400', iconClasses[size])} />
          ) : isActive ? (
            <Power className={cn('text-green-500', iconClasses[size])} />
          ) : (
            <PowerOff className={cn('text-gray-400', iconClasses[size])} />
          )}
        </motion.span>
      </button>
    </div>
  );
};

export default StatusToggle;