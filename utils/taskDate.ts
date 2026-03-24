export function parseTimeToDate(date: Date, timeStr: string): Date | null {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const lower = timeStr.toLowerCase();
  const match =
    timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i) || timeStr.match(/(\d{1,2})\s*(am|pm)/i);
  if (!match) return null;
  let hours = 0,
    minutes = 0;
  if (match[3]) {
    hours = parseInt(match[1], 10);
    minutes = match[2] ? parseInt(match[2], 10) : 0;
    if (lower.includes('pm') && hours !== 12) hours += 12;
    if (lower.includes('am') && hours === 12) hours = 0;
  } else if (match[2]) {
    hours = parseInt(match[1], 10);
    if (lower.includes('pm') && hours !== 12) hours += 12;
    if (lower.includes('am') && hours === 12) hours = 0;
  }
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

export function formatCompletedAt(completedAt?: number): string {
  if (!completedAt) return 'Completed';
  const d = new Date(completedAt);
  const h = d.getHours();
  const m = d.getMinutes();
  const am = h < 12;
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `Completed at ${h12}:${m.toString().padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
}

export function getCountdown(date: Date, timeStr: string): string {
  const scheduled = parseTimeToDate(date, timeStr);
  if (!scheduled) return '–';
  const now = new Date();
  const diff = scheduled.getTime() - now.getTime();
  if (diff <= 0) return 'Overdue';
  const h = Math.floor(diff / (1000 * 60 * 60));
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (h > 0) return `In ${h}h ${m}m`;
  if (m > 0) return `In ${m}m`;
  return 'Now';
}

export function formatTimeDisplay(timeStr: string): string {
  if (!timeStr) return '–';
  return timeStr.toLowerCase().includes('at') ? timeStr : `at ${timeStr}`;
}

/**
 * Parse duration string to minutes
 * Supports formats like: "30 min", "1h", "2 hours", "1h 30m", "90m", etc.
 */
export function parseDurationToMinutes(duration: string): number {
  if (!duration || typeof duration !== 'string') return 0;
  
  const lower = duration.toLowerCase().trim();
  let totalMinutes = 0;
  
  // Match hours: "1h", "2 hours", "2h 30m"
  const hourMatch = lower.match(/(\d+)\s*h(?:ours?|r)?/);
  if (hourMatch) {
    totalMinutes += parseInt(hourMatch[1], 10) * 60;
  }
  
  // Match minutes: "30 min", "30m", "30 minutes"
  const minMatch = lower.match(/(\d+)\s*m(?:in(?:utes?)?)?/);
  if (minMatch) {
    totalMinutes += parseInt(minMatch[1], 10);
  }
  
  // If no match found, try to parse as just a number (assume minutes)
  if (totalMinutes === 0) {
    const numMatch = lower.match(/(\d+)/);
    if (numMatch) {
      totalMinutes = parseInt(numMatch[1], 10);
    }
  }
  
  return totalMinutes;
}

/**
 * Format minutes to readable string
 */
export function formatMinutes(minutes: number): string {
  if (minutes === 0) return '0 min';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}
