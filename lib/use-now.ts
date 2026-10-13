'use client';

import { useEffect, useState } from 'react';

/** The time, ticking every `ms` — for "last seen", schedules, anything that ages on screen. */
export function useNow(ms = 60_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(timer);
  }, [ms]);
  return now;
}
