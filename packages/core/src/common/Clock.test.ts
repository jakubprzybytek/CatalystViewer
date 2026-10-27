import { describe, expect, it } from 'vitest';
import { now } from './Clock';

describe('now', () => {
  it('is the reference date when one is set', () => {
    expect(now('2026-10-27T12:00:00.000Z').toISOString()).toBe('2026-10-27T12:00:00.000Z');
  });

  it('is the real time without one', () => {
    const before = Date.now();
    const value = now('').getTime();
    expect(value).toBeGreaterThanOrEqual(before);
    expect(value).toBeLessThanOrEqual(Date.now());
  });

  it('rejects an invalid reference date', () => {
    expect(() => now('27.10.2026')).toThrow('Invalid REFERENCE_DATE');
  });
});
