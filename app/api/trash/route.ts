import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// GET: Listar todos os itens da lixeira (imóveis e leads deletados)
export async function GET() {
  try {
    const supabase = createAdminClient();

    const [{ data: properties, error: propError }, { data: leads, error: leadError }] = await Promise.all([
      supabase
        .from('properties')
        .select('*')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase
        .from('leads')
        .select('*, properties(title)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
    ]);

    if (propError || leadError) {
      console.error('Erro ao buscar itens da lixeira:', propError || leadError);
      return NextResponse.json({ 
        properties: properties || [], 
        leads: leads || [] 
      });
    }

    return NextResponse.json({
      properties: properties || [],
      leads: leads || [],
    });
  } catch (err: any) {
    console.error('Erro no get da lixeira:', err);
    return NextResponse.json({ properties: [], leads: [], error: err.message }, { status: 500 });
  }
}

// POST: Ações de Restaurar ou Excluir Definitivamente
export async function POST(req: Request) {
  try {
    const { action, type, id } = await req.json();

    if (!action || !type || !id) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const table = type === 'lead' ? 'leads' : 'properties';

    if (action === 'restore') {
      // Restaurar item (remover marca de lixeira)
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Item restaurado com sucesso!' });
    } else if (action === 'permanent_delete') {
      // Excluir definitivamente do banco
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Item excluído definitivamente!' });
    } else if (action === 'soft_delete') {
      // Mover para lixeira
      const { error } = await supabase
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      return NextResponse.json({ success: true, message: 'Item movido para a lixeira!' });
    }

    return NextResponse.json({ error: 'Ação não suportada.' }, { status: 400 });
  } catch (err: any) {
    console.error('Erro ao processar ação na lixeira:', err);
    return NextResponse.json({ error: err.message || 'Erro ao processar solicitação.' }, { status: 500 });
  }
}
