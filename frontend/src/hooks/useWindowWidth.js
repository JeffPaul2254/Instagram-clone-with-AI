import { useState, useEffect } from 'react';

/**
 * Returns the current window width, updating on resize.
 * Safe for SSR — defaults to 1200 if window is not available.
 */
export function useWindowWidth() {
  const [width, setWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );

  useEffect(() => {
    let rafId;
    const handler = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('resize', handler);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return width;
}
