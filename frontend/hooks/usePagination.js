import { useCallback, useMemo, useState } from 'react';

export function usePagination({
  totalItems = 0,
  initialPage = 1,
  initialPageSize = 10,
} = {}) {
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const totalPages = useMemo(() => {
    if (pageSize <= 0) return 1;
    const pages = Math.ceil(totalItems / pageSize);
    return pages > 0 ? pages : 1;
  }, [totalItems, pageSize]);

  const clampPage = useCallback(
    (nextPage) => {
      if (!Number.isFinite(nextPage)) return 1;
      if (nextPage < 1) return 1;
      if (nextPage > totalPages) return totalPages;
      return nextPage;
    },
    [totalPages],
  );

  const goToPage = useCallback(
    (nextPage) => {
      setPage((current) => clampPage(nextPage ?? current));
    },
    [clampPage],
  );

  const goToFirst = useCallback(() => {
    setPage(1);
  }, []);

  const goToLast = useCallback(() => {
    setPage(totalPages);
  }, [totalPages]);

  const goToNext = useCallback(() => {
    setPage((current) => clampPage(current + 1));
  }, [clampPage]);

  const goToPrevious = useCallback(() => {
    setPage((current) => clampPage(current - 1));
  }, [clampPage]);

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const range = useMemo(() => {
    if (totalItems === 0) {
      return { from: 0, to: 0 };
    }
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, totalItems);
    return { from, to };
  }, [page, pageSize, totalItems]);

  return {
    page,
    pageSize,
    totalPages,
    setPage,
    setPageSize,
    goToPage,
    goToFirst,
    goToLast,
    goToNext,
    goToPrevious,
    canGoPrevious,
    canGoNext,
    range,
  };
}

