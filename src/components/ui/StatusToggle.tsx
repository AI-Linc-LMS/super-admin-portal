import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/helpers';

export interface StatusToggleProps {
  isActive: boolean;
  onToggle: (newStatus: boolean) => Promise<void>;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { track: 'h-5 w-9', thumb: 'h-3.5 w-3.5', travel: 16, icon: 'h-2.5 w-2.5' },
  md: { track: 'h-6 w-11', thumb: 'h-4.5 w-4.5', travel: 20, icon: 'h-3 w-3' },
  lg: { track: 'h-7 w-[3.25rem]', thumb: 'h-5 w-5', travel: 24, icon: 'h-3.5 w-3.5' },
} as const;

const StatusToggle: React.FC<StatusToggleProps> = ({
  isActive,
  onToggle,
  disabled = false,
  size = 'md',
  showLabels = true,
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const s = SIZE_MAP[size];

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

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      {showLabels && (
        <span
          className={cn(
            'font-mono text-[10px] font-semibold uppercase tracking-widest2 transition-colors',
            isActive ? 'text-emerald-400' : 'text-text-mute'
          )}
        >
          {isActive ? 'Active' : 'Inactive'}
        </span>
      )}

      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled || isLoading}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full p-0.5',
          'transition-all duration-300 ease-out',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0',
          s.track,
          isActive
            ? 'bg-brand-grad shadow-glow focus-visible:ring-brand-cyan/50'
            : 'bg-ink-3 border border-themed-2 focus-visible:ring-text-mute/40',
          (disabled || isLoading) && 'cursor-not-allowed opacity-50'
        )}
        role="switch"
        aria-checked={isActive}
        aria-label={`Toggle status: currently ${isActive ? 'active' : 'inactive'}`}
      >
        <motion.span
          animate={{ x: isActive ? s.travel : 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'pointer-events-none inline-flex items-center justify-center rounded-full',
            'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.35)]',
            s.thumb
          )}
        >
          {isLoading && (
            <Loader2 className={cn('animate-spin text-text-dim', s.icon)} />
          )}
        </motion.span>
      </button>
    </div>
  );
};

export default StatusToggle;
