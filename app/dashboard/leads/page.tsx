import { createClient } from '@/lib/supabase/server';
import { LeadTable } from '@/components/leads/lead-table';
import { collectPages } from '@/supabase/functions/_shared/feed';
import type { Lead } from '@/lib/types';
export const revalidate = 0;
export default async function Page() {
  const client = await createClient();
  const signal = AbortSignal.timeout(25000);
  const rows = await collectPages<Lead>(async cursor => {
    let query = client.from('leads').select('*, properties(title)').is('deleted_at',null).order('id').limit(500);
    if(cursor) query=query.gt('id',cursor);
    const { data,error }=await query.abortSignal(signal);
    if(error) throw error;
    return (data || []) as unknown as Lead[];
  });
  rows.sort((a,b)=>b.created_at.localeCompare(a.created_at));
  return <LeadTable initialLeads={rows} />;
}
