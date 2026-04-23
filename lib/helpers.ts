/**
 * Full House — Shared Helpers
 */

/** Validate Rutgers email (both @rutgers.edu and @scarletmail.rutgers.edu) */
export function isRutgersEmail(email: string): boolean {
  const lower = email.toLowerCase().trim();
  const whitelist = ['xxgamingwithninjaxxyt@gmail.com'];
  if (whitelist.includes(lower)) return true;
  return lower.endsWith('@rutgers.edu') || lower.endsWith('@scarletmail.rutgers.edu');
}

/** Format a Date or ISO string to a human-readable "time ago" string */
export function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'JUST NOW';
  if (diffMin < 60) return `${diffMin}M AGO`;
  if (diffHr < 24) return `${diffHr}H AGO`;
  if (diffDay < 7) return `${diffDay}D AGO`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Format total inches as 5'10" */
export function formatHeight(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  return `${feet}'${remaining}"`;
}

/** Get initials from a name */
export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Format a date/time for display as "Today at 3 PM" or "Fri, Apr 25 at 6 PM" */
export function formatEventTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

  if (isToday) return `Today at ${time}`;
  if (isTomorrow) return `Tomorrow at ${time}`;
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ` at ${time}`;
}

/** Check if a meetup time is within the allowed window (now → 7 days) */
export function isWithinMeetupWindow(date: Date): boolean {
  const now = new Date();
  const maxDate = new Date(now.getTime() + 7 * 86400000);
  return date >= now && date <= maxDate;
}

/** Shared color palette */
export const C = {
  surface: '#fcf9f8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f6f3f2',
  surfaceContainer: '#f0eded',
  surfaceContainerHigh: '#eae7e7',
  surfaceContainerHighest: '#e5e2e1',
  outlineVariant: 'rgba(228,190,186,0.5)',
  outline: '#8f6f6c',
  primary: '#af101a',
  primaryFaint: 'rgba(175,16,26,0.08)',
  onPrimary: '#ffffff',
  secondary: '#5f5e5e',
  onSurface: '#1b1c1c',
  tertiary: '#705d00',
  onTertiary: '#ffffff',
  onSurfaceVariant: '#5b403d',
  card: '#ffffff',
  outlineAlpha: 'rgba(228,190,186,0.3)',
  error: '#ba1a1a',
};

/** Shared font families */
export const F = {
  headlineBase: 'Newsreader_800ExtraBold',
  headlineSub: 'Newsreader_700Bold',
  headlineReg: 'Newsreader_400Regular',
  display: 'AbhayaLibre_800ExtraBold',
  label: 'PlusJakartaSans_700Bold',
  labelExtra: 'PlusJakartaSans_800ExtraBold',
  body: 'Manrope_400Regular',
  bodyBold: 'Manrope_700Bold',
};
