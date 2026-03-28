import { useCallback, useState } from 'react';
import {
  clampOffsetToTotal,
  createServerPaginationHandlers,
  pageFromOffset,
  pageRangeFromSlice,
  totalPagesFromTotal,
} from '@/lib/pagination/serverPagination';
import { SERVER_TABLE_PAGE_SIZES } from '@/lib/pagination/constants';

/**
 * limit/offset for server lists (API: limit, offset, meta.total).
 * Call `clampToTotal(totalRows)` when `meta.total` is trustworthy — skip while the
 * list query is fetching (otherwise `total` can be 0 and offset resets to the first page).
 *
 * Build props for DataTable via `toDataTableServerPagination({ totalRows, ... })`.
 * If overriding `pageSizeOptions`, use a stable array (module constant / useMemo), not an
 * inline literal, so `toDataTableServerPagination` identity does not churn every render.
 */
export function useServerOffsetPagination({
  initialLimit = 50,
  pageSizeOptions = SERVER_TABLE_PAGE_SIZES,
} = {}) {
  const [limit, setLimitState] = useState(initialLimit);
  const [offset, setOffset] = useState(0);

  const setLimit = useCallback((n) => {
    setLimitState(n);
    setOffset(0);
  }, []);

  const resetPage = useCallback(() => setOffset(0), []);

  const clampToTotal = useCallback(
    (totalRows) => {
      setOffset((o) => {
        const next = clampOffsetToTotal(o, totalRows, limit);
        return next === o ? o : next;
      });
    },
    [limit],
  );

  const toDataTableServerPagination = useCallback(
    ({ totalRows, pageRowCount, isLoading, ariaLabel }) => {
      const totalPages = totalPagesFromTotal(totalRows, limit);
      const page = pageFromOffset(offset, limit);
      const handlers = createServerPaginationHandlers({
        limit,
        totalPages,
        setOffset,
        onPageSizeChange: setLimit,
      });
      return {
        page,
        totalPages,
        totalRows,
        pageSize: limit,
        pageSizeOptions,
        ...pageRangeFromSlice(offset, pageRowCount),
        pageRowCount,
        isLoading,
        ariaLabel,
        ...handlers,
      };
    },
    [limit, offset, pageSizeOptions, setLimit],
  );

  return {
    limit,
    offset,
    setOffset,
    setLimit,
    resetPage,
    clampToTotal,
    pageSizeOptions,
    toDataTableServerPagination,
  };
}
