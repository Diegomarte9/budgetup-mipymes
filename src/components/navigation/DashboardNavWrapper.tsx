'use client';

import { useOrganization } from '@/hooks/useOrganization';
import { useHydration } from '@/hooks/useHydration';
import { DashboardNav } from './DashboardNav';

export function DashboardNavWrapper() {
  const isHydrated = useHydration();
  const { 
    currentOrganization, 
    organizations, 
    switchOrganization,
    isLoading 
  } = useOrganization();

  // Don't render anything until hydrated on client
  if (!isHydrated) {
    return null;
  }

  // Show loading state or empty nav while loading
  if (isLoading) {
    return (
      <DashboardNav 
        currentOrganization={undefined}
        organizations={[]}
        onOrganizationChange={() => {}}
      />
    );
  }

  return (
    <DashboardNav 
      currentOrganization={currentOrganization}
      organizations={organizations}
      onOrganizationChange={switchOrganization}
    />
  );
}