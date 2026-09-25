// Alternativa ao endpoint Next.js; ambos utilizam o mesmo serializador VR-SYNC.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.1';
import { buildFeed, collectPages, FEED_COLUMNS, XML_CONTENT_TYPE, type FeedProperty } from '../_shared/feed.ts';

Deno.serve(async (request: Request) => {
  if (!['GET','HEAD'].includes(request.method)) return new Response(null, { status:405, headers:{ Allow:'GET, HEAD' } });
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('Configuração Supabase ausente');
    // A tabela ? privada. Nunca abrir SELECT público para servir este feed.
    const client = createClient(url, key, { auth:{ persistSession:false, autoRefreshToken:false } });
    const signal = AbortSignal.timeout(25000);
    const properties = await collectPages<FeedProperty>(async cursor => {
      let query = client.from('properties').select(FEED_COLUMNS).eq('status','active')
        .eq('feed_enabled',true).is('deleted_at',null).order('id').limit(500);
      if (cursor) query = query.gt('id',cursor);
      const { data, error } = await query.abortSignal(signal);
      if (error) throw error;
      if (!data) throw new Error('Consulta retornou dados nulos');
      return data as unknown as FeedProperty[];
    });
    const xml = buildFeed(properties, {
      name:Deno.env.get('FEED_CONTACT_NAME') || '', email:Deno.env.get('FEED_CONTACT_EMAIL') || '',
      phone:Deno.env.get('FEED_CONTACT_PHONE') || '', website:Deno.env.get('FEED_CONTACT_WEBSITE') || undefined,
    }, url);
    return new Response(request.method === 'HEAD' ? null : xml, { status:200, headers:{
      'Content-Type':XML_CONTENT_TYPE, 'Cache-Control':'public, max-age=300', 'X-Content-Type-Options':'nosniff',
    } });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error('Feed VR-SYNC indisponível', { requestId, error });
    return new Response(request.method === 'HEAD' ? null : '<?xml version="1.0" encoding="UTF-8"?><Erro><Mensagem>Feed indisponível. Consulte os logs.</Mensagem><RequestId>' + requestId + '</RequestId></Erro>', {
      status:503, headers:{ 'Content-Type':XML_CONTENT_TYPE, 'Cache-Control':'no-store' },
    });
  }
});
