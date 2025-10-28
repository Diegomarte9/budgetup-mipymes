import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardNavWrapper } from '@/components/navigation/DashboardNavWrapper';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  // Check if user has completed onboarding
  const { data: memberships, error } = await supabase
    .from('memberships')
    .select('id')
    .eq('user_id', user.id)
    .limit(1);

  if (error) {
    console.error('Error checking memberships in dashboard layout:', error);
  }

  // If user has no memberships, redirect to onboarding
  if (!memberships || memberships.length === 0) {
    redirect('/auth/onboarding');
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardNavWrapper />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}