import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../utils/helpers';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'group relative inline-flex items-center justify-center rounded-lg font-medium ' +
      'transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2 ' +
      'focus-visible:ring-brand-cyan/60 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-0 ' +
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ' +
      'whitespace-nowrap select-none';

    const variants = {
      primary:
        'bg-brand-grad text-white shadow-glow hover:shadow-glow-blue ' +
        'hover:-translate-y-px active:translate-y-0',
      secondary:
        'bg-ink-2 text-text border border-themed-2 hover:bg-ink-3 hover:border-brand-cyan/40 ' +
        'hover:text-brand-cyan',
      danger:
        'bg-danger-600 text-white hover:bg-danger-500 shadow-[0_8px_30px_-10px_rgba(255,90,106,0.45)]',
      ghost:
        'bg-transparent text-text-dim hover:text-text hover:bg-line/[0.06]',
      outline:
        'border border-themed-2 bg-transparent text-text hover:border-brand-cyan/50 ' +
        'hover:text-brand-cyan',
      gold:
        'bg-brand-gold/15 text-brand-gold border border-brand-gold/30 ' +
        'hover:bg-brand-gold/20 hover:border-brand-gold/50',
    } as const;

    const sizes = {
      sm: 'h-8 px-3 text-[13px]',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-[15px]',
    } as const;

    return (
      <button
        ref={ref}
        className={cn(
          baseClasses,
          variants[variant],
          sizes[size],
          isLoading && 'cursor-wait',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg
            className="-ml-1 mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {leftIcon && !isLoading && (
          <span className="mr-2 inline-flex">{leftIcon}</span>
        )}
        <span className="relative">{children}</span>
        {rightIcon && <span className="ml-2 inline-flex">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
