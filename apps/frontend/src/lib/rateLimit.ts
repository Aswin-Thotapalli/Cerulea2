// Simple in-process rate limiter. Works per-serverless-instance, which is
// sufficient to slow down brute-force from a single IP/email in a session window.
// For true distributed limiting, replace with Upstash or similar.

const cache = new Map<string, { count: number; expiresAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter?: number } {
  const now = Date.now();

  // Lazy cleanup to keep the map from growing unbounded
  if (cache.size > 5000) {
    for (const [k, v] of cache) {
      if (now > v.expiresAt) cache.delete(k);
    }
  }

  const entry = cache.get(key);
  if (!entry || now > entry.expiresAt) {
    cache.set(key, { count: 1, expiresAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.expiresAt - now) / 1000) };
  }

  entry.count++;
  return { ok: true };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'unknown';
}
