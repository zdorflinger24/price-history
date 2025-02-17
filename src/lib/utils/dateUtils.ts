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

// Use this when saving to Firestore
export function toFirestoreTimestamp(date: Date) {
  return {
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1e6
  };
}

// Use this when reading from Firestore
export function fromFirestoreTimestamp(timestamp: { seconds: number; nanoseconds: number }): Date {
  return new Date(timestamp.seconds * 1000 + timestamp.nanoseconds / 1e6);
} 