interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function checkRateLimit(ip: string, options: { windowMs?: number, maxRequests?: number } = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000;
  let maxRequests = options.maxRequests || 100;
  const now = Date.now();

  // If testing on local network (10.x.x.x or 192.168.x.x), allow 10x more requests
  if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip === "127.0.0.1") {
    maxRequests = maxRequests * 10;
  }

  let entry = rateLimitStore.get(ip);

  if (!entry || now >= entry.resetTime) {
    entry = { count: 1, resetTime: now + windowMs };
    rateLimitStore.set(ip, entry);
    return { limited: false, remaining: maxRequests - 1 };
  }

  entry.count++;

  if (entry.count > maxRequests) {
    console.warn(`[RATE LIMIT] IP ${ip} blocked. Count: ${entry.count}/${maxRequests}`);
    return { limited: true, remaining: 0 };
  }

  return { limited: false, remaining: maxRequests - entry.count };
}

export function resetRateLimit(ip: string) {
  rateLimitStore.delete(ip);
}