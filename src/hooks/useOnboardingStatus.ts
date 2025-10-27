import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Organization {
  id: string;
  name: string;
}

interface OnboardingStatusResponse {
  needsOnboarding: boolean;
  organizations: Array<{
    id: string;
    organization_id: string;
    organizations: Organization;
  }>;
}

export function useOnboardingStatus() {
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/user/onboarding-status');
        
        if (!response.ok) {
          throw new Error('Failed to check onboarding status');
        }

        const data: OnboardingStatusResponse = await response.json();
        
        setNeedsOnboarding(data.needsOnboarding);
        setOrganizations(data.organizations.map(m => m.organizations));
        
        // Redirect to onboarding if needed
        if (data.needsOnboarding) {
          router.push('/auth/onboarding');
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // On error, assume onboarding is needed to be safe
        setNeedsOnboarding(true);
        router.push('/auth/onboarding');
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [router]);

  return {
    needsOnboarding,
    organizations,
    loading,
  };
}