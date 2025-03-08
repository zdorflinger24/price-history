// Utility functions for consistent date handling

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function formatDisplayDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

export function getCurrentTimestamp(): Date {
  return new Date();
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
} 