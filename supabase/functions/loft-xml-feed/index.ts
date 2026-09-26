// Alternativa ao endpoint Next.js; ambos utilizam o mesmo serializador VR-SYNC.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.117.1';
import { feedErrorDetails } from '../_shared/feed-diagnostics.ts';
import { validateFeedImages } from '../_shared/feed-media.ts';
import { buildFeed, collectPages, publicImageUrl, listingId, FEED_COLUMNS, XML_CONTENT_TYPE, type FeedProperty } from '../_shared/feed.ts';

Deno.serve(async (request: Request) => {
  if (!['GET','HEAD'].includes(request.method)) return new Response(null, { status:405, headers:{ Allow:'GET, HEAD' } });
  let stage = 'configuration';
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) throw new Error('Configuração Supabase ausente');
    // A tabela ? privada. Nunca abrir SELECT público para servir este feed.
    const client = createClient(url, key, { auth:{ persistSession:false, autoRefreshToken:false } });
    stage = 'query';
    const signal = AbortSignal.timeout(25000);
    const properties = await collectPages<FeedProperty>(async cursor => {
      let query = client.from('properties').select(FEED_COLUMNS).eq('status','active')
        .eq('feed_enabled',true).is('deleted_at',null).order('id').limit(500);
      if (cursor) query = query.gt('id',cursor);
      const { data, error, status } = await query.abortSignal(signal);
      if (error) throw Object.assign(new Error(error.message), { name: 'FeedQueryError', code: error.code, status });
      if (!data) throw new Error('Consulta retornou dados nulos');
      return data as unknown as FeedProperty[];
    });
    stage = 'xml';
    const xml = buildFeed(properties, {
      name:Deno.env.get('FEED_CONTACT_NAME') || '', email:Deno.env.get('FEED_CONTACT_EMAIL') || '',
      phone:Deno.env.get('FEED_CONTACT_PHONE') || '', website:Deno.env.get('FEED_CONTACT_WEBSITE') || undefined,
    }, url);
    stage = 'images';
    for (const property of properties) {
      const problems = await validateFeedImages(property.images.map(path => publicImageUrl(path, url)), url, signal);
      if (problems.length) throw new Error(`Imóvel ${listingId(property)}: ${problems.join('; ')}`);
    }
    return new Response(request.method === 'HEAD' ? null : xml, { status:200, headers:{
      'Content-Type':XML_CONTENT_TYPE, 'Cache-Control':'public, max-age=300', 'X-Content-Type-Options':'nosniff',
    } });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error('Feed VR-SYNC indisponível', JSON.stringify({ requestId, stage,
      ...feedErrorDetails(error, Object.entries(Deno.env.toObject())
        .filter(([name]) => /KEY|SECRET|TOKEN|PASSWORD/i.test(name))
        .map(([, value]) => value)),
    }));
    return new Response(request.method === 'HEAD' ? null : '<?xml version="1.0" encoding="UTF-8"?><Erro><Mensagem>Feed indisponível. Consulte os logs.</Mensagem><RequestId>' + requestId + '</RequestId></Erro>', {
      status:503, headers:{ 'Content-Type':XML_CONTENT_TYPE, 'Cache-Control':'no-store' },
    });
  }
});
