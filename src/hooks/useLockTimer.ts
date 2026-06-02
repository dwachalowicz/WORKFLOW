import { useState, useEffect } from 'react';

/**
 * Hook that returns a live `Date.now()` timestamp, updating every 30 seconds.
 * Used to determine lock-badge freshness (e.g. "process locked by X" expiry).
 */
export const useLockTimer = (intervalMs = 30_000): number => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return now;
};
