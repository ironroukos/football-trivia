// lib/rateLimit.js
// Simple in-memory rate limiter for Next.js API routes.
// Limits each IP to `maxRequests` calls within `windowMs` milliseconds.
//
// Usage in an API handler:
//   import { rateLimit } from '../../lib/rateLimit';
//   const limiter = rateLimit({ windowMs: 60_000, maxRequests: 20 });
//
//   export default async function handler(req, res) {
//     if (!limiter.check(req)) {
//       return res.status(429).json({ error: 'Too many requests' });
//     }
//     // ... rest of handler
//   }
//
// Note: this resets on server restart (no Redis/persistence needed for a pub quiz).
// For production at scale, swap the Map for a Redis-backed store.

/**
 * @param {{ windowMs?: number, maxRequests?: number }} options
 */
export function rateLimit({ windowMs = 60_000, maxRequests = 30 } = {}) {
  // Map<ip, { count: number, resetAt: number }>
  const store = new Map();

  // Periodically clear expired entries to avoid memory leaks
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store.entries()) {
      if (record.resetAt <= now) store.delete(ip);
    }
  }, windowMs);

  // Don't keep the process alive just for cleanup
  if (cleanup.unref) cleanup.unref();

  return {
    /**
     * Returns true if the request is allowed, false if rate-limited.
     * @param {import('next').NextApiRequest} req
     */
    check(req) {
      const ip =
        (req.headers['x-forwarded-for'] || '')
          .split(',')[0]
          .trim() || req.socket?.remoteAddress || 'unknown';

      const now = Date.now();
      const record = store.get(ip);

      if (!record || record.resetAt <= now) {
        store.set(ip, { count: 1, resetAt: now + windowMs });
        return true;
      }

      record.count += 1;

      if (record.count > maxRequests) {
        return false;
      }

      return true;
    },
  };
}