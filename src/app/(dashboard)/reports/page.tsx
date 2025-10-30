import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { ReportsPage } from '@/components/reports/ReportsPage';

export default async function Reports() {
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

  const currentOrganization = organizations[0];

  if (!currentOrganization) {
    redirect('/auth/onboarding');
  }

  return <ReportsPage organizationId={currentOrganization.id} />;
}