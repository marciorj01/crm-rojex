import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { apiError, readObject, checkOrigin, isUuid } from '@/lib/http';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    if (!await getCurrentUser()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const client = await createClient();
    const [properties, leads] = await Promise.all([
      client.from('properties').select('*').not('deleted_at','is',null).order('deleted_at',{ascending:false}),
      client.from('leads').select('*,properties(title)').not('deleted_at','is',null).order('deleted_at',{ascending:false}),
    ]);
    if (properties.error || leads.error) throw properties.error || leads.error;
    return NextResponse.json({ properties: properties.data, leads: leads.data }, { headers: { 'Cache-Control':'no-store' } });
  } catch (error) { return apiError(error); }
}
export async function POST(req: Request) {
  const denied = checkOrigin(req); if (denied) return denied;
  try {
    if (!await getCurrentUser()) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const { action, type, id } = await readObject(req);
    if (!isUuid(id) || typeof type !== 'string' || typeof action !== 'string' || !['property','lead'].includes(type) || !['restore','soft_delete','permanent_delete'].includes(action)) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }
    const client = await createClient();
    const table = type === 'lead' ? 'leads' : 'properties';
    // Permanent deletion is allowed only for records already in the trash.
    const query = action === 'permanent_delete'
      ? client.from(table).delete().eq('id',id).not('deleted_at','is',null)
      : client.from(table).update({ deleted_at: action === 'restore' ? null : new Date().toISOString() }).eq('id',id);
    const { data, error } = await query.select('id');
    if (error) throw error;
    if (!data?.length) return NextResponse.json({ error: 'Registro não encontrado para esta operação.' }, { status: 404 });
    return NextResponse.json({ success:true });
  } catch (error) { return apiError(error); }
}
