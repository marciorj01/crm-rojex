import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { feedContact } from '@/lib/feed-contact';
import { checkOrigin, readObject, isUuid } from '@/lib/http';
import { propertyErrors, publicImageUrl, validateFeedContact, type FeedProperty } from '@/supabase/functions/_shared/feed';
import { validateFeedImages } from '@/supabase/functions/_shared/feed-media';

export const maxDuration = 60;
const reply = (errors: string[], status: number) => NextResponse.json({ errors }, {
  status, headers: { 'Cache-Control': 'no-store' },
});

// Read-only preflight: the form saves only after it succeeds. The feed validates
// again, so bypassing the form cannot publish an invalid listing.
export async function POST(request: Request) {
  const denied = checkOrigin(request); if (denied) return denied;
  try {
    if (!await getCurrentUser()) return reply(['Sessão inválida. Entre novamente.'], 401);
    const body = await readObject(request);
    if (body.id !== undefined && !isUuid(body.id)) return reply(['Identificador inválido'], 400);
    const property = { ...body, id: body.id || crypto.randomUUID() } as FeedProperty;
    const storageUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const problems = propertyErrors(property, storageUrl);
    try { validateFeedContact(feedContact()); }
    catch { problems.push('Configure FEED_CONTACT_NAME, FEED_CONTACT_EMAIL, FEED_CONTACT_PHONE e o website opcional no servidor'); }
    if (problems.length) return reply(problems, 422);
    const client = await createClient();
    let query = client.from('properties').select('id').eq('code', property.code || property.id).limit(1);
    if (body.id) query = query.neq('id', property.id);
    const { data, error } = await query;
    if (error) return reply(['Não foi possível verificar se o código já existe. Tente novamente.'], 503);
    if (data?.length) return reply(['Código já utilizado por outro imóvel'], 422);
    const imageErrors = await validateFeedImages(property.images.map(path => publicImageUrl(path, storageUrl)),
      storageUrl, AbortSignal.timeout(25000));
    return reply(imageErrors, imageErrors.length ? 422 : 200);
  } catch {
    return reply(['Não foi possível validar os dados do feed. Revise os campos e tente novamente.'], 400);
  }
}
