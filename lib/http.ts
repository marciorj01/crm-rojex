import { NextResponse } from 'next/server';

export function checkOrigin(request: Request): NextResponse | null {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origem da solicitação não permitida.' }, { status: 403 });
  }
  return null;
}

export function apiError(error: unknown): NextResponse {
  if (error instanceof SyntaxError) return NextResponse.json({ error: 'JSON inválido.' }, { status: 400 });
  if (error instanceof BodyTooLarge) return NextResponse.json({ error: 'Corpo da solicitação muito grande.' }, { status: 413 });
  const requestId = crypto.randomUUID();
  console.error('CRM request failed', { requestId, error });
  return NextResponse.json({ error: 'Não foi possível concluir a operação.', requestId },
    { status: 500, headers: { 'Cache-Control': 'no-store' } });
}

export class BodyTooLarge extends Error {}
export async function readObject(request: Request): Promise<Record<string, unknown>> {
  const body = await readJson(request);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new SyntaxError('Objeto esperado');
  return body as Record<string, unknown>;
}
export async function readJson(request: Request, limit = 65536): Promise<unknown> {
  if (Number(request.headers.get('content-length')) > limit) throw new BodyTooLarge();
  const reader = request.body?.getReader();
  if (!reader) throw new SyntaxError('Corpo ausente');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new BodyTooLarge(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return JSON.parse(new TextDecoder().decode(bytes));
}

export const isUuid = (value: unknown): value is string => typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
