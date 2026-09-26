import { test } from 'node:test';
import assert from 'node:assert/strict';
import { feedErrorDetails } from '../supabase/functions/_shared/feed-diagnostics';

test('feed logs preserve Error fields, query status and code without dumping objects', () => {
  const error = Object.assign(new Error('Invalid API key'), {
    name: 'FeedQueryError', status: 401, code: 'PGRST301',
    headers: { authorization: 'not-for-logs' }, details: 'not-for-logs',
  });
  const details = feedErrorDetails(error);
  assert.equal(details.name, 'FeedQueryError');
  assert.equal(details.message, 'Invalid API key');
  assert.equal(details.status, 401);
  assert.equal(details.code, 'PGRST301');
  assert.match(details.stack!, /FeedQueryError: Invalid API key/);
  assert.doesNotMatch(JSON.stringify(details), /not-for-logs/);
  assert.equal(feedErrorDetails({ message: 'Query failed', code: '42703' }).code, '42703');
});

test('feed diagnostics redact configured keys, token formats and URL credentials', () => {
  const sensitive = ['configured-secret', 'eyJfake.payload.signature', 'sb_secret_example',
    'opaque-bearer', 'private-password', 'query-secret', 'url-password'];
  const error = new Error(`configured-secret eyJfake.payload.signature sb_secret_example ` +
    `Bearer opaque-bearer password=private-password https://user:url-password@example.com/rest?apikey=query-secret`);
  const output = JSON.stringify(feedErrorDetails(error, ['configured-secret']));
  for (const value of sensitive) assert.ok(!output.includes(value), 'Sensitive value must not appear');
  assert.match(output, /REDACTED/);
  assert.equal(feedErrorDetails(null).name, 'FeedError');
  assert.equal(feedErrorDetails('plain error').message, 'plain error');
});
