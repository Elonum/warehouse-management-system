import { useCallback, useState } from 'react';

export function useModalState(initialValue = null) {
  const [isOpen, setIsOpen] = useState(false);
  const [data, setData] = useState(initialValue);

  const open = useCallback((payload = null) => {
    setData(payload ?? null);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const reset = useCallback(() => {
    setData(initialValue);
    setIsOpen(false);
  }, [initialValue]);

  return {
    isOpen,
    data,
    open,
    close,
    reset,
    setData,
    setIsOpen,
  };
}

