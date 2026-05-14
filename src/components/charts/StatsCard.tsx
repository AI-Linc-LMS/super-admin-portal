import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import {
  formatNumber,
  formatCurrency,
  formatPercentage,
  getGrowthIndicator,
} from '../../utils/helpers';
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

const COLOR_MAP = {
  primary: {
    grad: 'bg-brand-grad',
    glow: 'shadow-[0_0_40px_-10px_rgba(35,86,214,0.55)]',
    ring: 'group-hover:shadow-[0_18px_50px_-20px_rgba(35,86,214,0.7)]',
    text: 'text-brand-blue',
    halo: 'bg-brand-blue/20',
  },
  secondary: {
    grad: 'bg-gradient-to-br from-brand-cyan to-brand-blue',
    glow: 'shadow-[0_0_40px_-10px_rgba(0,224,255,0.55)]',
    ring: 'group-hover:shadow-[0_18px_50px_-20px_rgba(0,224,255,0.7)]',
    text: 'text-brand-cyan',
    halo: 'bg-brand-cyan/20',
  },
  accent: {
    grad: 'bg-gradient-to-br from-brand-gold to-[#ffb845]',
    glow: 'shadow-[0_0_40px_-10px_rgba(255,198,109,0.55)]',
    ring: 'group-hover:shadow-[0_18px_50px_-20px_rgba(255,198,109,0.6)]',
    text: 'text-brand-gold',
    halo: 'bg-brand-gold/20',
  },
  danger: {
    grad: 'bg-gradient-to-br from-danger-500 to-danger-700',
    glow: 'shadow-[0_0_40px_-10px_rgba(255,90,106,0.55)]',
    ring: 'group-hover:shadow-[0_18px_50px_-20px_rgba(255,90,106,0.55)]',
    text: 'text-danger-500',
    halo: 'bg-danger-500/20',
  },
} as const;

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  previousValue,
  icon: Icon,
  format = 'number',
  suffix = '',
  color = 'primary',
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

  const growth =
    previousValue !== undefined && typeof value === 'number'
      ? getGrowthIndicator(value, previousValue)
      : null;

  const c = COLOR_MAP[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'group relative overflow-hidden rounded-xl border border-themed surface-card p-6',
        'shadow-glass transition-all duration-300 ease-out',
        'hover:-translate-y-0.5 hover:border-themed-2',
        c.ring
      )}
    >
      {/* gradient top edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line/20 to-transparent"
      />
      {/* corner halo */}
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full blur-3xl opacity-40 transition-opacity duration-500',
          c.halo,
          'group-hover:opacity-70'
        )}
      />

      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest2 text-text-mute">
            {title}
          </p>
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="serif-num mt-2.5 text-[34px] font-medium leading-none tracking-tight text-text"
          >
            {formatValue(value)}
          </motion.p>

          {growth ? (
            <div className="mt-3 flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[10px] font-semibold',
                  growth.isPositive &&
                    'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
                  !growth.isPositive &&
                    !growth.isNeutral &&
                    'border-danger-500/30 bg-danger-500/10 text-danger-500',
                  growth.isNeutral && 'border-themed-2 bg-line/[0.04] text-text-mute'
                )}
              >
                {growth.isPositive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : growth.isNeutral ? (
                  <Minus className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {formatPercentage(growth.percentage / 100)}
              </span>
              <span className="text-[11px] text-text-mute">vs last period</span>
            </div>
          ) : (
            <p className="mt-3 font-mono text-[11px] text-text-mute">— · live</p>
          )}
        </div>

        {/* Icon well */}
        <div
          className={cn(
            'relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
            c.grad,
            c.glow
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-br from-white/25 to-transparent"
          />
          <Icon className="relative h-[22px] w-[22px] text-white" strokeWidth={1.75} />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;
