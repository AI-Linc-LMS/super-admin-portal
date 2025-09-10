import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import Card from '../ui/Card';
import { formatNumber, formatCurrency, formatPercentage, getGrowthIndicator } from '../../utils/helpers';
import { cn } from '../../utils/helpers';

interface StatsCardProps {
  title: string;
  value: number | string;
  previousValue?: number;
  icon: LucideIcon;
  format?: 'number' | 'currency' | 'percentage';
  suffix?: string;
  color?: 'primary' | 'secondary' | 'accent' | 'danger';
  glassmorphism?: boolean;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  previousValue,
  icon: Icon,
  format = 'number',
  suffix = '',
  color = 'primary',
  glassmorphism = true,
}) => {
  const formatValue = (val: number | string): string => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'currency':
        return formatCurrency(val);
      case 'percentage':
        return formatPercentage(val);
      case 'number':
      default:
        return formatNumber(val) + suffix;
    }
  };

  const growth = previousValue && typeof value === 'number' 
    ? getGrowthIndicator(value, previousValue)
    : null;

  const colorClasses = {
    primary: 'from-primary-500 to-primary-600',
    secondary: 'from-secondary-500 to-secondary-600',
    accent: 'from-accent-500 to-accent-600',
    danger: 'from-danger-500 to-danger-600',
  };

  return (
    <Card glassmorphism={glassmorphism} hover className="relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <motion.p
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, type: 'spring' }}
            className="text-2xl font-bold text-gray-900"
          >
            {formatValue(value)}
          </motion.p>
          
          {growth && (
            <div className="flex items-center mt-2">
              <span
                className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full',
                  growth.isPositive
                    ? 'bg-secondary-100 text-secondary-700'
                    : 'bg-danger-100 text-danger-700',
                  growth.isNeutral && 'bg-gray-100 text-gray-700'
                )}
              >
                {growth.isPositive ? '+' : growth.isNeutral ? '' : '-'}
                {formatPercentage(growth.percentage / 100)}
              </span>
              <span className="text-xs text-gray-500 ml-1">vs last period</span>
            </div>
          )}
        </div>

        <div className={cn(
          'w-12 h-12 rounded-lg bg-gradient-to-br flex items-center justify-center',
          colorClasses[color]
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Background decoration */}
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-white/10 to-white/5 rounded-full blur-xl" />
    </Card>
  );
};

export default StatsCard;