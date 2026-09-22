import { describe, it, expect } from 'vitest';
import { calculateBackoffDelay } from '../src/state/backoff.js';

describe('Reconnection Backoff Algorithm', () => {
  it('increases delay exponentially up to maxDelayMs with jitter', () => {
    const baseMs = 500;
    const maxMs = 5000;

    const delay0 = calculateBackoffDelay(0, baseMs, maxMs, false);
    const delay1 = calculateBackoffDelay(1, baseMs, maxMs, false);
    const delay2 = calculateBackoffDelay(2, baseMs, maxMs, false);
    const delay10 = calculateBackoffDelay(10, baseMs, maxMs, false);

    expect(delay0).toBe(500);
    expect(delay1).toBe(1000);
    expect(delay2).toBe(2000);
    expect(delay10).toBe(maxMs); // Clamped at 5000ms
  });

  it('adds jitter within [0.75, 1.25] multiplier window', () => {
    const baseMs = 1000;
    const maxMs = 10000;

    for (let i = 0; i < 20; i++) {
      const delay = calculateBackoffDelay(0, baseMs, maxMs, true);
      expect(delay).toBeGreaterThanOrEqual(750);
      expect(delay).toBeLessThanOrEqual(1250);
    }
  });
});
