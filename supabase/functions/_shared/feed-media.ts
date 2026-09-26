// Only this project's public Storage is probed. Never fetch arbitrary listing URLs
// on the server (SSRF), forward cookies/API keys, or follow redirects.
export async function validateFeedImages(urls: string[], storageUrl: string,
  signal: AbortSignal, fetcher: typeof fetch = fetch): Promise<string[]> {
  const errors: string[] = [];
  const storage = new URL(storageUrl);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(4, urls.length) }, async () => {
    while (next < urls.length) {
      const index = next++;
      const label = `Foto ${index + 1}`;
      try {
        const url = new URL(urls[index]);
        if (url.origin !== storage.origin || !url.pathname.startsWith('/storage/v1/object/public/property_images/') ||
          url.username || url.password || url.search || url.hash) {
          errors.push(`${label}: use uma URL pública do bucket property_images deste projeto`);
          continue;
        }
        const options = { signal, redirect: 'error' as const, credentials: 'omit' as const };
        const head = await fetcher(url.href, { ...options, method: 'HEAD' });
        if (!head.ok) { errors.push(`${label}: não acessível publicamente (HTTP ${head.status})`); continue; }
        const size = Number(head.headers.get('content-length'));
        if (head.headers.get('content-type')?.split(';')[0].trim() !== 'image/jpeg' ||
          !Number.isSafeInteger(size) || size < 3 || size > 7_000_000) {
          errors.push(`${label}: deve ser JPEG com tamanho conhecido de até 7 MB`); continue;
        }
        const response = await fetcher(url.href, { ...options, headers: { Range: 'bytes=0-2' } });
        const reader = response.body?.getReader();
        const bytes: number[] = [];
        try {
          if (response.ok && reader) {
            while (bytes.length < 3) {
              const { done, value } = await reader.read();
              if (done) break;
              bytes.push(...value.subarray(0, 3 - bytes.length));
            }
          }
        } finally { await reader?.cancel(); }
        if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
          errors.push(`${label}: conteúdo não reconhecido como JPEG`);
        }
      } catch { errors.push(`${label}: não foi possível verificar a imagem pública; tente novamente`); }
    }
  }));
  return errors.sort();
}
