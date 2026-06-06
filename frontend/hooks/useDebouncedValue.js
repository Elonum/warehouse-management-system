import { useEffect, useState } from 'react';

/**
 * Returns a value that updates after `delayMs` of stability.
 * Useful for server search/filter inputs without firing a request per keystroke.
 */
export function useDebouncedValue(value, delayMs = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
