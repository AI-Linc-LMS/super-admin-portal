import React from 'react';
import { cn } from '../../utils/helpers';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  glassmorphism?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

const Card: React.FC<CardProps> = ({
  children,
  className,
  glassmorphism = false,
  padding = 'md',
  hover = false,
}) => {
  const baseClasses = 'rounded-lg border transition-all duration-200';
  
  const glassClasses = glassmorphism
    ? 'bg-white/10 backdrop-blur-md border-white/20 shadow-glass'
    : 'bg-white border-gray-200 shadow-sm';

  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  const hoverClasses = hover ? 'hover:shadow-lg hover:-translate-y-0.5' : '';

  return (
    <div
      className={cn(
        baseClasses,
        glassClasses,
        paddingClasses[padding],
        hoverClasses,
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;