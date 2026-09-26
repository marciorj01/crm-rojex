import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateFeedImages } from '../supabase/functions/_shared/feed-media';

const storage = 'https://storage.example.com';
const url = `${storage}/storage/v1/object/public/property_images/photo.jpg`;
const signal = () => AbortSignal.timeout(1000);

test('fotos públicas são verificadas sem autenticação e sem seguir redirects', async () => {
  let requests = 0;
  const mock = (async (_input, options) => {
    requests++;
    assert.equal(options?.redirect, 'error');
    assert.equal(options?.credentials, 'omit');
    assert.equal(new Headers(options?.headers).has('authorization'), false);
    return options?.method === 'HEAD'
      ? new Response(null, { headers:{ 'content-type':'image/jpeg', 'content-length':'500' } })
      : new Response(new Uint8Array([0xff,0xd8,0xff]));
  }) as typeof fetch;
  assert.deepEqual(await validateFeedImages([url], storage, signal(), mock), []);
  assert.equal(requests, 2);
});

test('validação bloqueia SSRF, buckets privados, tokens em URLs e redirecionamentos', async () => {
  let requests = 0;
  const mock = (async () => { requests++; throw new Error('redirect'); }) as typeof fetch;
  for (const value of ['http://127.0.0.1/a.jpg', 'http://169.254.169.254/a.jpg',
    'https://external.example/a.jpg', `${storage}/storage/v1/object/sign/property_images/a.jpg`,
    `${url}?token=secret`, `${url}#fragment`]) {
    assert.equal((await validateFeedImages([value], storage, signal(), mock)).length, 1);
  }
  assert.equal(requests, 0);
  assert.equal((await validateFeedImages([url], storage, signal(), mock)).length, 1);
});

test('fotos quebradas, grandes, de outro formato ou JPEG falso são bloqueadas', async () => {
  for (const response of [new Response(null,{status:404}),
    new Response(null,{headers:{'content-type':'image/png','content-length':'500'}}),
    new Response(null,{headers:{'content-type':'image/jpeg','content-length':'7000001'}}),
    new Response(null,{headers:{'content-type':'image/jpeg'}})]) {
    assert.equal((await validateFeedImages([url], storage, signal(), (async()=>response) as typeof fetch)).length, 1);
  }
  const mock = (async (_input, options) => options?.method === 'HEAD'
    ? new Response(null,{headers:{'content-type':'image/jpeg','content-length':'500'}})
    : new Response('not jpeg')) as typeof fetch;
  assert.equal((await validateFeedImages([url], storage, signal(), mock)).length, 1);
});
