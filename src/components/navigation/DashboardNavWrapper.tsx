'use client';

import { useOrganization } from '@/hooks/useOrganization';
import { DashboardNav } from './DashboardNav';

export function DashboardNavWrapper() {
  const { 
    currentOrganization, 
    organizations, 
    switchOrganization,
    isLoading 
  } = useOrganization();

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