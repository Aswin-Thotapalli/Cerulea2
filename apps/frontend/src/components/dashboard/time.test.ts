import { describe, expect, it } from 'vitest';

import { durationText, fullDate, longDate, relativeTime, shortDate } from './time';

const now = new Date('2026-10-04T12:00:00.000Z');

describe('relativeTime', () => {
  it('reads just now inside the first minute', () => {
    expect(relativeTime('2026-10-04T11:59:40.000Z', now)).toBe('just now');
  });

  it('counts minutes, hours and days from the real timestamp', () => {
    expect(relativeTime('2026-10-04T11:45:00.000Z', now)).toBe('15 min ago');
    expect(relativeTime('2026-10-04T09:00:00.000Z', now)).toBe('3 h ago');
    expect(relativeTime('2026-10-01T12:00:00.000Z', now)).toBe('3 d ago');
  });

  it('falls back to the date after a month', () => {
    expect(relativeTime('2026-08-01T12:00:00.000Z', now)).toMatch(/1 Aug/);
  });

  it('reads unmeasured for an absent or unreadable timestamp', () => {
    expect(relativeTime(null, now)).toBe('unmeasured');
    expect(relativeTime('yesterday', now)).toBe('unmeasured');
  });
});

describe('durationText', () => {
  it('spells seconds, minutes, hours and days', () => {
    expect(durationText(30)).toBe('30 s');
    expect(durationText(150)).toBe('2 min');
    expect(durationText(71159.634)).toBe('19 h 45 min');
    expect(durationText(2 * 86400 + 3 * 3600)).toBe('2 d 3 h');
  });

  it('reads unmeasured for an absent figure', () => {
    expect(durationText(null)).toBe('unmeasured');
    expect(durationText(Number.NaN)).toBe('unmeasured');
  });
});

describe('the date phrases', () => {
  it('spell the long, the short and the full date', () => {
    expect(longDate(now)).toMatch(/Sunday, 4 October|Sunday 4 October/);
    expect(shortDate('2026-10-03T07:27:55.363Z')).toMatch(/3 Oct/);
    expect(fullDate('2026-10-03T07:27:55.363Z')).toMatch(/3 Oct 2026/);
  });
});
