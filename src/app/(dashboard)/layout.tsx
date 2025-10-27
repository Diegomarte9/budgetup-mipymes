import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardNav } from '@/components/navigation/DashboardNav';

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

  // Get user's organizations
  const { data: memberships } = await supabase
    .from('memberships')
    .select(`
      role,
      organizations (
        id,
        name
      )
    `)
    .eq('user_id', user.id);

  const organizations = memberships?.map(m => ({
    id: (m.organizations as any).id,
    name: (m.organizations as any).name,
    role: m.role,
  })) || [];

  return (
    <div className="min-h-screen bg-background">
      <DashboardNav 
        currentOrganization={organizations[0]} 
        organizations={organizations}
      />
      <main className="container mx-auto px-4 py-6">{children}</main>
    </div>
  );
}