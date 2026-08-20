'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { LoadingOverlay } from '@mantine/core';

interface LoadingContextType {
  showLoading: () => void;
  hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used within LoadingProvider');
  return ctx;
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const countRef = useRef(0);

  const showLoading = useCallback(() => {
    countRef.current += 1;
    setVisible(true);
  }, []);

  const hideLoading = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) setVisible(false);
  }, []);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      <div style={{ position: 'relative', minHeight: '100%' }}>
        {children}
        <LoadingOverlay visible={visible} />
      </div>
    </LoadingContext.Provider>
  );
}
