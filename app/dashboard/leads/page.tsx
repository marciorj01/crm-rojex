import { createAdminClient } from '@/lib/supabase/admin';
import { LeadTable } from '@/components/leads/lead-table';

export const revalidate = 0;

export default async function LeadsPage() {
  const supabase = createAdminClient();

  const { data: leads, error } = await supabase
    .from('leads')
    .select('*, properties(title)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar lista de leads:', error);
  }

  return <LeadTable initialLeads={leads || []} />;
}
