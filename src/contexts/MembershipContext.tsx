'use client';

import { createContext, useContext, useCallback, useState } from 'react';

interface MembershipContextType {
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const triggerRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <MembershipContext.Provider value={{ refreshTrigger, triggerRefresh }}>
      {children}
    </MembershipContext.Provider>
  );
}

export function useMembershipRefresh() {
  const context = useContext(MembershipContext);
  if (context === undefined) {
    throw new Error('useMembershipRefresh must be used within a MembershipProvider');
  }
  return context;
}