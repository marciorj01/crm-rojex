import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { checkOrigin } from '../lib/http';

test('development accepts only local browser origins when Next uses an internal URL', t => {
  const previous = process.env.NODE_ENV;
  Reflect.set(process.env, 'NODE_ENV', 'development');
  t.after(() => {
    if (previous === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Reflect.set(process.env, 'NODE_ENV', previous);
  });
  t.mock.method(os, 'networkInterfaces', () => ({
    ethernet: [{ address: '172.18.128.1', family: 'IPv4', internal: false,
      netmask: '255.255.240.0', mac: '00:00:00:00:00:00', cidr: '172.18.128.1/20' }],
  }));
  const check = (origin: string | null, host: string, extra = {}) => {
    const headers: Record<string, string> = { host, ...extra };
    if (origin !== null) headers.origin = origin;
    return checkOrigin(new Request('http://0.0.0.0:3000/api/auth/login', {
      method: 'POST', headers,
    }));
  };
  for (const host of ['localhost:3000', '127.0.0.1:3000', '[::1]:3000', '172.18.128.1:3000']) {
    assert.equal(check(`http://${host}`, host), null, host);
  }
  for (const [origin, host] of [
    [null, 'localhost:3000'], ['null', 'localhost:3000'],
    ['invalid', 'localhost:3000'],
    ['http://localhost:3000/path', 'localhost:3000'],
    ['http://localhost:3001', 'localhost:3001'],
    ['https://localhost:3000', 'localhost:3000'],
    ['http://localhost:3000', '172.18.128.1:3000'],
    ['http://172.18.128.2:3000', '172.18.128.2:3000'],
    ['http://evil.example:3000', 'evil.example:3000'],
    ['http://localhost.evil.example:3000', 'localhost.evil.example:3000'],
  ] as const) assert.equal(check(origin, host)?.status, 403, `${origin} / ${host}`);
  assert.equal(check('http://localhost:3000', 'evil.example:3000', {
    'x-forwarded-host': 'localhost:3000', 'x-forwarded-proto': 'http',
  })?.status, 403);
});

test('production keeps exact same-origin validation despite local or forwarded Host', t => {
  const previous = process.env.NODE_ENV;
  Reflect.set(process.env, 'NODE_ENV', 'production');
  t.after(() => {
    if (previous === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else Reflect.set(process.env, 'NODE_ENV', previous);
  });
  for (const origin of ['http://localhost:3000', 'http://172.18.128.1:3000', 'https://evil.example']) {
    assert.equal(checkOrigin(new Request('https://crm.example/api/auth/login', {
      headers: { origin, host: new URL(origin).host, 'x-forwarded-host': new URL(origin).host },
    }))?.status, 403);
  }
  assert.equal(checkOrigin(new Request('https://crm.example/api/auth/login', {
    headers: { origin: 'https://crm.example' },
  })), null);
  assert.equal(checkOrigin(new Request('https://crm.example/api/auth/login'))?.status, 403);
});
