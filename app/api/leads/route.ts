import { NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, isUuid, readJson } from '@/lib/http';
import { normalizeLead } from '@/lib/leads';

export async function POST(req: Request) {
  try {
    const secret = process.env.LEAD_WEBHOOK_SECRET;
    if (!secret || secret.length < 32) return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 503 });
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i,'').trim();
    const hash = (s: string) => createHash('sha256').update(s).digest();
    if (!token || !timingSafeEqual(hash(token),hash(secret))) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
    const body = await readJson(req);
    let lead: ReturnType<typeof normalizeLead>;
    try { lead = normalizeLead(body); }
    catch { return NextResponse.json({ error: 'Lead inválido. Confira os dados de contato e os limites dos campos.' }, { status: 400 }); }
    const client = createAdminClient();
    let propertyId: string | null = null;
    if (lead.listing) {
      const column = isUuid(lead.listing) ? 'id' : 'code';
      const { data, error } = await client.from('properties').select('id')
        .eq(column,column === 'id' ? lead.listing : lead.listing.toUpperCase()).maybeSingle();
      if (error) throw error;
      if (!data) return NextResponse.json({ error:'Imóvel do anúncio não encontrado.' }, { status:422 });
      propertyId = data.id;
    }
    const payload = { name:lead.name, email:lead.email, phone:lead.phone, message:lead.message,
      source:'Loft', external_id:lead.external_id, property_id:propertyId, status:'new' };
    const { data, error } = await client.from('leads').insert(payload).select('id').single();
    if (error?.code === '23505' && lead.external_id) {
      const existing = await client.from('leads').select('id').eq('source','Loft').eq('external_id',lead.external_id).single();
      if (existing.error) throw existing.error;
      return NextResponse.json({ success:true, lead_id:existing.data.id, duplicate:true });
    }
    if (error) throw error;
    return NextResponse.json({ success:true, lead_id:data.id }, { status:201 });
  } catch (error) { return apiError(error); }
}
