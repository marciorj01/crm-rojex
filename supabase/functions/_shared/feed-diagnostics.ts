// Log only explicit diagnostic fields; never serialize clients, requests or headers.
export function feedErrorDetails(error: unknown, secrets: string[] = []) {
  const redact = (value: string) => {
    let result = value;
    for (const secret of secrets.filter(Boolean).sort((a, b) => b.length - a.length)) {
      result = result.split(secret).join('[REDACTED]');
    }
    return result
      .replace(/\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[REDACTED]')
      .replace(/\bsb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[REDACTED]')
      .replace(/\b(Bearer\s+)\S+/gi, '$1[REDACTED]')
      .replace(/https?:\/\/[^\s)]+/g, value => {
        try { const url = new URL(value); return `${url.origin}${url.pathname}`; }
        catch { return '[URL REDACTED]'; }
      })
      .replace(/((?:password|senha|token|api[_-]?key|authorization)\s*[:=]\s*)[^\s,;]+/gi, '$1[REDACTED]')
      .slice(0, 4000);
  };
  const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
  const text = (field: string) => typeof record[field] === 'string' ? redact(record[field] as string) : undefined;
  return {
    name: text('name') || 'FeedError',
    message: text('message') || (typeof error === 'string' ? redact(error) : 'Unknown feed error'),
    code: text('code'),
    status: typeof record.status === 'number' ? record.status : undefined,
    stack: text('stack'),
  };
}
