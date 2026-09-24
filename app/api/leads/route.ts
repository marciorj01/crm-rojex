import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    // 1. Validação de Segurança via Token no Cabeçalho Authorization
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
    const webhookSecret = process.env.LEAD_WEBHOOK_SECRET || 'token_secreto_webhook_rojex_2026';

    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: 'Cabeçalho Authorization não fornecido.' },
        { status: 401 }
      );
    }

    // Suporta tanto "Bearer TOKEN" quanto apenas "TOKEN"
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    if (token !== webhookSecret) {
      return NextResponse.json(
        { success: false, message: 'Token de autorização inválido.' },
        { status: 403 }
      );
    }

    // 2. Extração dos Dados do Lead enviados pelo Portal / Webhook
    const body = await req.json();

    const name = body.name || body.client_name || body.contact?.name || 'Cliente Sem Nome';
    const email = body.email || body.client_email || body.contact?.email || '';
    const phone = body.phone || body.client_phone || body.contact?.phone || '';
    const message = body.message || body.lead_message || body.notes || '';
    const source = body.source || body.origin || 'Portal Loft';
    const propertyId = body.property_id || body.listing_id || null;

    if (!name && !email && !phone) {
      return NextResponse.json(
        { success: false, message: 'Dados incompletos do lead (é necessário nome, email ou telefone).' },
        { status: 400 }
      );
    }

    // 3. Gravação na tabela 'leads' no Supabase
    const supabase = createAdminClient();

    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        name,
        email,
        phone,
        message,
        source,
        property_id: propertyId && propertyId.length === 36 ? propertyId : null,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao salvar lead no banco de dados:', error);
      return NextResponse.json(
        { success: false, message: 'Erro ao gravar lead no banco de dados Supabase.', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Lead recebido e gravado com sucesso no CRM.',
        lead_id: newLead.id,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('Erro inesperado no Webhook de Leads:', err);
    return NextResponse.json(
      { success: false, message: 'Erro interno ao processar requisição de lead.', details: errorMessage },
      { status: 500 }
    );
  }
}
