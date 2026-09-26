import { test } from 'node:test';
import assert from 'node:assert/strict';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

// Run explicitly with npm run test:feed-http while npm run dev is running.
// A safe 503 is tested as an error, never reported as a publishable feed.
const base = process.env.FEED_TEST_BASE_URL || 'http://localhost:3000';
test('aliases entregam XML diretamente e preservam sucesso ou erro seguro do feed', async t => {
  let expectedStatus: number | undefined;
  for (const path of ['/api/feed', '/feed.xml', '/portais/feeds/arquivo.xml', '/portais/feeds/imoveis.xml']) {
    const response = await fetch(new URL(path, base), { redirect:'manual', signal:AbortSignal.timeout(35000) });
    expectedStatus ??= response.status;
    assert.equal(response.status, expectedStatus);
    assert.equal(response.headers.get('location'), null);
    assert.equal(response.headers.get('content-type'), 'application/xml; charset=utf-8');
    const xml = await response.text();
    assert.equal(XMLValidator.validate(xml), true);
    const data = new XMLParser().parse(xml);
    if (response.status === 200) {
      assert.ok(data.ListingDataFeed.Header.Provider);
      assert.ok(Object.hasOwn(data.ListingDataFeed, 'Listings'));
    } else {
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.equal(data.Erro.Mensagem, 'Feed indisponível. Consulte os logs.');
      assert.ok(data.Erro.RequestId);
      assert.doesNotMatch(xml, /stack|service_role|sb_secret_|SUPABASE_|FeedQueryError/);
    }
    t.diagnostic(`${path}: HTTP ${response.status}${response.status === 503 ? ' (erro seguro; publicação pendente)' : ' (feed válido)'}`);
  }
});

test('preflight de publicação exige sessão e proteção de origem', async () => {
  const url = new URL('/api/feed/validate', base);
  const response = await fetch(url, { method:'POST', headers:{ origin:new URL(base).origin, 'content-type':'application/json' }, body:'{}' });
  assert.equal(response.status, 401);
  const crossSite = await fetch(url, { method:'POST', headers:{ origin:'https://evil.example', 'content-type':'application/json' }, body:'{}' });
  assert.equal(crossSite.status, 403);
});
