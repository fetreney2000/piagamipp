'use client';

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

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

function ProgressBar({ visible }: { visible: boolean }) {
  const [mounted, setMounted] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setAnimating(true);
    } else if (mounted) {
      setAnimating(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [visible, mounted]);

  if (!mounted) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: 3,
        zIndex: 9999,
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <div
        style={{
          height: '100%',
          background: 'linear-gradient(90deg, var(--mantine-color-blue-6), var(--mantine-color-cyan-5))',
          borderRadius: '0 2px 2px 0',
          transition: 'opacity 300ms ease',
          opacity: animating ? 1 : 0,
          ...(animating
            ? {
                animation: 'loading-progress-bar 1.5s ease-in-out infinite',
              }
            : {}),
        }}
      />
      <style>{`
        @keyframes loading-progress-bar {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
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
      {children}
      <ProgressBar visible={visible} />
    </LoadingContext.Provider>
  );
}
