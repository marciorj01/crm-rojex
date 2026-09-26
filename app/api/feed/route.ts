import { createAdminClient } from '@/lib/supabase/admin';
import { feedContact } from '@/lib/feed-contact';
import { validateFeedImages } from '@/supabase/functions/_shared/feed-media';
import { feedErrorDetails } from '@/supabase/functions/_shared/feed-diagnostics';
import { buildFeed, collectPages, publicImageUrl, listingId, FEED_COLUMNS, XML_CONTENT_TYPE, type FeedProperty } from '@/supabase/functions/_shared/feed';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  let stage = 'configuration';
  try {
    const client = createAdminClient();
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
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const xml = buildFeed(properties, feedContact(), storageUrl);
    stage = 'images';
    for (const property of properties) {
      const problems = await validateFeedImages(property.images.map(path => publicImageUrl(path, storageUrl)), storageUrl, signal);
      if (problems.length) throw new Error(`Imóvel ${listingId(property)}: ${problems.join('; ')}`);
    }
    return new Response(xml, { status: 200, headers: {
      'Content-Type': XML_CONTENT_TYPE, 'Cache-Control': 'public, max-age=60, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    const requestId = crypto.randomUUID();
    console.error('Feed VR-SYNC indisponível', JSON.stringify({ requestId, stage,
      ...feedErrorDetails(error, Object.entries(process.env)
        .filter(([name]) => /KEY|SECRET|TOKEN|PASSWORD/i.test(name))
        .map(([, value]) => value || '')),
    }));
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Erro><Mensagem>Feed indisponível. Consulte os logs.</Mensagem><RequestId>' + requestId + '</RequestId></Erro>', {
      status: 503, headers: { 'Content-Type': XML_CONTENT_TYPE, 'Cache-Control': 'no-store' },
    });
  }
}
