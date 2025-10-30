'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to prevent hydration mismatches by ensuring components
 * only render after client-side hydration is complete
 */
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return isHydrated;
}