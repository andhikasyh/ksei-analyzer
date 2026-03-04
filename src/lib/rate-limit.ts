const windowMs = 10 * 60 * 1000; // 10 minutes
const maxRequests = 10;

interface Entry {
  timestamps: number[];
}

const store = new Map<string, Entry>();

let lastCleanup = Date.now();
const cleanupInterval = 5 * 60 * 1000;

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < cleanupInterval) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);
    if (entry.timestamps.length === 0) store.delete(key);
  }
}

export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
} {
  cleanup();

  const now = Date.now();
  const entry = store.get(identifier) || { timestamps: [] };

  entry.timestamps = entry.timestamps.filter((t) => now - t < windowMs);

  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0];
    const retryAfterMs = oldest + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs,
    };
  }

  entry.timestamps.push(now);
  store.set(identifier, entry);

  return {
    allowed: true,
    remaining: maxRequests - entry.timestamps.length,
    retryAfterMs: 0,
  };
}
