// apps/frontend/src/components/dashboard/time.ts
// The plain time phrases the Dashboard screens put beside a real timestamp.
// Every phrase is computed from a timestamp Cerulea APIs returned and the
// clock of the browser. Nothing here is typed in by hand.
// Without this module each screen would spell a duration its own way.

/** How long ago a timestamp was, in the short form the production screens show. */
export function relativeTime(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'unmeasured';
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 'unmeasured';
  const seconds = Math.max(0, Math.round((now.getTime() - then) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return new Date(then).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** A number of seconds as a short duration, such as 19 h 45 min. */
export function durationText(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return 'unmeasured';
  const whole = Math.max(0, Math.floor(seconds));
  const days = Math.floor(whole / 86400);
  const hours = Math.floor((whole % 86400) / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  if (days > 0) return `${days} d ${hours} h`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min`;
  return `${whole} s`;
}

/** The long date the Overview header shows, such as Saturday, 4 October. */
export function longDate(now: Date = new Date()): string {
  return now.toLocaleDateString('en-GB', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** The short day and month the project tables show, such as 3 Oct. */
export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** A full date, such as 3 Oct 2026. */
export function fullDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
