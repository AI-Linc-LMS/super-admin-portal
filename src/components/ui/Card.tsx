import React from 'react';
import { cn } from '../../utils/helpers';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  glassmorphism?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  glow?: 'none' | 'cyan' | 'blue' | 'gold';
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  glassmorphism = false,
  padding = 'md',
  hover = false,
  glow = 'none',
}) => {
  const base =
    'relative rounded-xl border border-themed transition-all duration-300 ease-out ' +
    'overflow-hidden';

  // Both variants now live in the AI Linc dark palette. The glassmorphism
  // flag is preserved for API compatibility — it just dials up the blur.
  const surface = glassmorphism
    ? 'bg-ink-1/60 backdrop-blur-xl shadow-glass'
    : 'surface-card shadow-glass';

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  } as const;

  const glows = {
    none: '',
    cyan: 'shadow-glow',
    blue: 'shadow-glow-blue',
    gold: 'shadow-glow-gold',
  } as const;

  const hoverFx = hover
    ? 'hover:-translate-y-0.5 hover:border-brand-cyan/30 hover:shadow-glow'
    : '';

  return (
    <div
      className={cn(
        base,
        surface,
        paddings[padding],
        glows[glow],
        hoverFx,
        className
      )}
    >
      {/* subtle gradient hairline at the top edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px
          bg-gradient-to-r from-transparent via-line/15 to-transparent"
      />
      {children}
    </div>
  );
};

export default Card;
