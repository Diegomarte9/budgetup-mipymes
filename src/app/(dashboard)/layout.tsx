'use client';

import { DashboardNavWrapper } from '@/components/navigation/DashboardNavWrapper';
import { useSession } from '@/components/providers/session-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, initialized } = useSession();
  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    if (!initialized) return;

    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Check onboarding status only once when component mounts
    const checkOnboarding = async () => {
      try {
        const supabase = createClient();
        const { data: memberships, error } = await supabase
          .from('memberships')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error checking memberships in dashboard layout:', error);
          setHasAccess(true); // Allow access on error to prevent blocking
          setCheckingAccess(false);
          return;
        }

        // If user has no memberships, redirect to onboarding
        if (!memberships || memberships.length === 0) {
          router.push('/auth/onboarding');
          return;
        }

        setHasAccess(true);
        setCheckingAccess(false);
      } catch (error) {
        console.error('Error in onboarding check:', error);
        setHasAccess(true); // Allow access on error
        setCheckingAccess(false);
      }
    };

    checkOnboarding();
  }, [user, initialized, router]);

  // Show loading while checking session or access
  if (loading || !initialized || checkingAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Don't render if user doesn't have access
  if (!hasAccess) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavWrapper />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}