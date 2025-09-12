import { format, parseISO, isValid } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatDate(date: string | Date, formatStr = 'MMM dd, yyyy'): string {
  try {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    if (!isValid(parsedDate)) return 'Invalid Date';
    return format(parsedDate, formatStr);
  } catch {
    return 'Invalid Date';
  }
}

export function formatCurrency(amount: number, currency = 'INR'): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat('en-US', options).format(num);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function generateInitials(firstName: string, lastName?: string): string {
  if (!firstName || firstName.trim() === '') {
    return 'U'; // Default fallback for undefined/empty firstName
  }
  
  if (!lastName || lastName.trim() === '') {
    return firstName.charAt(0).toUpperCase();
  }
  
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function getStatusColor(status: string | undefined | null): string {
  if (!status) {
    return 'bg-gray-100 text-gray-700'; // Default color for undefined/null status
  }
  
  const statusLower = status.toLowerCase();
  switch (statusLower) {
    case 'active':
    case 'published':
      return 'bg-secondary-100 text-secondary-700';
    case 'inactive':
    case 'unpublished':
      return 'bg-gray-100 text-gray-700';
    case 'pending':
      return 'bg-accent-100 text-accent-700';
    case 'suspended':
    case 'cancelled':
      return 'bg-danger-100 text-danger-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function getDifficultyColor(difficulty: string | undefined | null): string {
  if (!difficulty) {
    return 'bg-gray-100 text-gray-700'; // Default color for undefined/null difficulty
  }
  
  switch (difficulty.toLowerCase()) {
    case 'easy':
      return 'bg-secondary-100 text-secondary-700';
    case 'medium':
      return 'bg-accent-100 text-accent-700';
    case 'hard':
      return 'bg-danger-100 text-danger-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

export function downloadCSV(data: any[], filename: string): void {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV values
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function getGrowthIndicator(currentValue: number, previousValue: number): {
  percentage: number;
  isPositive: boolean;
  isNeutral: boolean;
} {
  if (previousValue === 0) {
    return { percentage: 0, isPositive: false, isNeutral: true };
  }

  const percentage = ((currentValue - previousValue) / previousValue) * 100;
  return {
    percentage: Math.abs(percentage),
    isPositive: percentage > 0,
    isNeutral: percentage === 0,
  };
}