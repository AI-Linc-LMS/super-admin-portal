import React, { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/helpers';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helpText, leftIcon, rightIcon, type, id, ...props }, ref) => {
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block font-mono text-[11px] font-semibold uppercase
              tracking-widest2 text-text-dim"
          >
            {label}
          </label>
        )}
        <div className="relative group">
          {leftIcon && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-text-mute group-focus-within:text-brand-cyan transition-colors">
                {leftIcon}
              </span>
            </div>
          )}
          <input
            id={inputId}
            type={type}
            ref={ref}
            className={cn(
              'flex h-10 w-full rounded-lg border border-themed-2 bg-ink-1/60 px-3 py-2',
              'text-[14px] text-text placeholder:text-text-mute',
              'transition-colors duration-200',
              'focus:outline-none focus:border-brand-cyan/50 focus:bg-ink-1/90',
              'focus:shadow-[0_0_0_3px_rgba(0,224,255,0.12)]',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-danger-500/60 focus:border-danger-500 focus:shadow-[0_0_0_3px_rgba(255,90,106,0.15)]',
              className
            )}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-text-mute">{rightIcon}</span>
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1.5 font-mono text-[11px] text-danger-500">{error}</p>
        )}
        {!error && helpText && (
          <p className="mt-1.5 text-[12px] text-text-mute">{helpText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
