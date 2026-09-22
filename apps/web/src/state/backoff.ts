/**
 * Calculates exponential backoff with full jitter to avoid thundering herds.
 */
export function calculateBackoffDelay(
  attempt: number,
  baseMs = 500,
  maxMs = 10000,
  withJitter = true
): number {
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempt));
  if (!withJitter) {
    return exponential;
  }
  // Jitter between 0.75 and 1.25
  const jitterFactor = 0.75 + Math.random() * 0.5;
  return Math.round(exponential * jitterFactor);
}
