import { createAdminClient } from '@/lib/supabase/admin';
import { buildFeed, collectPages, FEED_COLUMNS, XML_CONTENT_TYPE, type FeedProperty } from '@/supabase/functions/_shared/feed';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const client = createAdminClient();
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
      name: process.env.FEED_CONTACT_NAME || '', email: process.env.FEED_CONTACT_EMAIL || '',
      phone: process.env.FEED_CONTACT_PHONE || '', website: process.env.FEED_CONTACT_WEBSITE || undefined,
    }, process.env.NEXT_PUBLIC_SUPABASE_URL!);
    return new Response(xml, { status: 200, headers: {
      'Content-Type': XML_CONTENT_TYPE, 'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error('Feed VR-SYNC indisponível', { requestId, error });
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Erro><Mensagem>Feed indisponível. Consulte os logs.</Mensagem><RequestId>' + requestId + '</RequestId></Erro>', {
      status: 503, headers: { 'Content-Type': XML_CONTENT_TYPE, 'Cache-Control': 'no-store' },
    });
  }
}
