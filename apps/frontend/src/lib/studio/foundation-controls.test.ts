import { describe, expect, it } from 'vitest';

import {
  BLOCK_SECONDS,
  HISTORY_RETENTION_DAYS,
  boundFix,
  describeBlockSeconds,
  describeRetention,
  withinBound,
} from './foundation-controls';

describe('every network control', () => {
  it('states what it does and what breaks without it', () => {
    for (const control of [BLOCK_SECONDS, HISTORY_RETENTION_DAYS]) {
      expect(control.does.length).toBeGreaterThan(30);
      expect(control.breaks.length).toBeGreaterThan(30);
      expect(control.bound.least).toBeLessThan(control.bound.most);
      expect(control.bound.fallback).toBeGreaterThanOrEqual(control.bound.least);
      expect(control.bound.fallback).toBeLessThanOrEqual(control.bound.most);
    }
  });

  it('holds a value inside its bounds', () => {
    expect(withinBound(0, BLOCK_SECONDS.bound)).toBe(1);
    expect(withinBound(900, BLOCK_SECONDS.bound)).toBe(60);
    expect(withinBound(2.4, BLOCK_SECONDS.bound)).toBe(2);
    expect(withinBound(Number.NaN, BLOCK_SECONDS.bound)).toBe(BLOCK_SECONDS.bound.fallback);
  });

  it('names the correction rather than refusing in silence', () => {
    expect(boundFix(0, BLOCK_SECONDS)).toMatch(/at least 1 seconds/);
    expect(boundFix(90, BLOCK_SECONDS)).toMatch(/at most 60 seconds/);
    expect(boundFix(Number.NaN, BLOCK_SECONDS)).toMatch(/whole number/);
    expect(boundFix(3, BLOCK_SECONDS)).toBeNull();
  });

  it('states the consequence of the value in plain words', () => {
    expect(describeBlockSeconds(3)).toMatch(/20 blocks each minute/);
    expect(describeRetention(3650)).toMatch(/10.0 years/);
    expect(describeRetention(30)).toMatch(/30 days/);
  });
});
