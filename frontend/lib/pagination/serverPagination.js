/**
 * Helpers for API-style paging (limit + offset + total count).
 */

export function totalPagesFromTotal(totalRows, limit) {
  if (limit <= 0) return 1;
  return Math.max(1, Math.ceil(totalRows / limit));
}

export function pageFromOffset(offset, limit) {
  if (limit <= 0) return 1;
  return Math.floor(offset / limit) + 1;
}

export function pageRangeFromSlice(offset, pageRowCount) {
  if (pageRowCount <= 0) return { from: 0, to: 0 };
  return { from: offset + 1, to: offset + pageRowCount };
}

/**
 * When the result set shrinks or page size changes, keep offset valid.
 */
export function clampOffsetToTotal(offset, totalRows, limit) {
  if (totalRows <= 0) return 0;
  const pages = totalPagesFromTotal(totalRows, limit);
  const lastOffset = (pages - 1) * limit;
  return offset > lastOffset ? lastOffset : offset;
}

/** Handlers for ServerPaginationFooter / DataTable `serverPagination`. */
export function createServerPaginationHandlers({
  limit,
  totalPages,
  setOffset,
  onPageSizeChange,
}) {
  return {
    onPrev: () => setOffset((v) => Math.max(0, v - limit)),
    onNext: () =>
      setOffset((v) => Math.min(v + limit, Math.max(0, totalPages - 1) * limit)),
    onFirst: () => setOffset(0),
    onLast: () => setOffset(Math.max(0, totalPages - 1) * limit),
    onPageSelect: (p) => setOffset((p - 1) * limit),
    onPageSizeChange,
  };
}
