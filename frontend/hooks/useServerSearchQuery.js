import { useEffect, useMemo } from 'react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

export const SERVER_SEARCH_DEBOUNCE_MS = 300;

export function normalizeSearchQuery(value, maxLength = 100) {
  return String(value ?? '').trim().slice(0, maxLength);
}

/**
 * Debounced search term for server list APIs.
 * `forUi` reflects the live input; `forApi` is sent to the backend after debounce.
 */
export function useServerSearchQuery(
  inputValue,
  { debounceMs = SERVER_SEARCH_DEBOUNCE_MS, maxLength = 100, onDebouncedChange } = {},
) {
  const debouncedInput = useDebouncedValue(inputValue, debounceMs);
  const forApi = useMemo(
    () => normalizeSearchQuery(debouncedInput, maxLength),
    [debouncedInput, maxLength],
  );
  const forUi = useMemo(
    () => normalizeSearchQuery(inputValue, maxLength),
    [inputValue, maxLength],
  );

  useEffect(() => {
    onDebouncedChange?.();
  }, [forApi, onDebouncedChange]);

  return { forApi, forUi };
}
