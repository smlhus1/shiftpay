/**
 * Sliding-window rate limiter backed by Upstash Redis.
 *
 * Three layers run in order, cheapest first:
 *   1. Global per-hour cap   — hard lid on Anthropic spend
 *   2. Per-IP per-hour cap   — blocks the drive-by scrape
 *   3. Per-IP per-minute cap — smooths out burst abuse
 *
 * Enabled ONLY when both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 * secrets are set. Without them the middleware no-ops — the endpoint
 * remains functional so `supabase functions deploy` does not break in
 * environments (local dev, CI smoke) that do not need the guard.
 *
 * Sliding window is implemented with ZADD + ZCARD + ZREMRANGEBYSCORE.
 * Redis does the atomic bookkeeping; function just sends commands.
 *
 * Deploy:
 *   supabase secrets set UPSTASH_REDIS_REST_URL=https://xxx.upstash.io \
 *                        UPSTASH_REDIS_REST_TOKEN=AY...
 * Upstash free tier gives 10k commands/day → ~200 OCR requests/day head-
 * room once this runs. Beyond that, $0.20 / 100k commands.
 */

interface RateLimitConfig {
  /** Human-readable label for logs. */
  name: string;
  /** Window length in seconds. */
  windowSec: number;
  /** Max requests per window. */
  limit: number;
  /** Redis key (composed with the window start + identifier). */
  keyFor: (identifier: string) => string;
}

const PER_IP_MINUTE: RateLimitConfig = {
  name: "per-ip-minute",
  windowSec: 60,
  limit: 5,
  keyFor: (ip) => `rl:ocr:ip:${ip}:min`,
};

const PER_IP_HOUR: RateLimitConfig = {
  name: "per-ip-hour",
  windowSec: 60 * 60,
  limit: 30,
  keyFor: (ip) => `rl:ocr:ip:${ip}:hour`,
};

const GLOBAL_HOUR: RateLimitConfig = {
  name: "global-hour",
  windowSec: 60 * 60,
  limit: 500,
  keyFor: () => "rl:ocr:global:hour",
};

export interface RateLimitResult {
  allowed: boolean;
  /** Which limit triggered, or null when allowed. */
  limitedBy: string | null;
  /** Seconds until the caller can retry (best guess). */
  retryAfterSec: number;
}

interface UpstashRestResponse {
  result?: unknown;
  error?: string;
}

async function upstashCommand(
  url: string,
  token: string,
  command: (string | number)[]
): Promise<unknown> {
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  if (!resp.ok) {
    throw new Error(`Upstash ${resp.status}`);
  }
  const body = (await resp.json()) as UpstashRestResponse;
  if (body.error) throw new Error(body.error);
  return body.result;
}

/**
 * Increment + check a single sliding-window bucket. Returns current count
 * after the increment; caller compares to config.limit.
 */
async function hitAndCount(
  url: string,
  token: string,
  cfg: RateLimitConfig,
  identifier: string,
  nowMs: number
): Promise<number> {
  const key = cfg.keyFor(identifier);
  const windowStart = nowMs - cfg.windowSec * 1000;

  // Pipeline the three ops so we incur one network round-trip.
  const pipeline = [
    ["ZREMRANGEBYSCORE", key, "0", String(windowStart)],
    // score + member: we need them unique within the window; the ms
    // timestamp works because collisions are extremely rare and a
    // collision just means two requests get merged into one count slot.
    ["ZADD", key, String(nowMs), String(nowMs)],
    ["ZCARD", key],
    // Expire the key a little after the window so Redis drops empty keys.
    ["EXPIRE", key, String(cfg.windowSec + 10)],
  ];

  const body = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(pipeline),
  });
  if (!body.ok) throw new Error(`Upstash pipeline ${body.status}`);
  const results = (await body.json()) as UpstashRestResponse[];
  // results[2] corresponds to ZCARD
  const countResult = results[2]?.result;
  if (typeof countResult !== "number") {
    throw new Error("Upstash pipeline: unexpected ZCARD shape");
  }
  return countResult;
}

/**
 * Run the three-layer check. First layer to exceed aborts and returns
 * { allowed: false }. If Upstash is unavailable or secrets missing,
 * returns { allowed: true } (fail-open: better to serve a legit user
 * than to block all traffic on a Redis outage).
 */
export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
  const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");
  if (!url || !token) {
    return { allowed: true, limitedBy: null, retryAfterSec: 0 };
  }

  const now = Date.now();

  try {
    // Order matters — global first (cheapest rejection for spray attacks),
    // then per-IP hour, then per-IP minute.
    for (const cfg of [GLOBAL_HOUR, PER_IP_HOUR, PER_IP_MINUTE]) {
      const id = cfg === GLOBAL_HOUR ? "global" : ip;
      const count = await hitAndCount(url, token, cfg, id, now);
      if (count > cfg.limit) {
        return {
          allowed: false,
          limitedBy: cfg.name,
          retryAfterSec: cfg.windowSec,
        };
      }
    }
    return { allowed: true, limitedBy: null, retryAfterSec: 0 };
  } catch (e) {
    // Fail-open. Log and let the request through — a Redis outage is
    // not a reason to break a user's OCR import.
    console.warn("[ocr] rate-limit Upstash unavailable, falling open:", e);
    return { allowed: true, limitedBy: null, retryAfterSec: 0 };
  }
}

/**
 * Extract the caller's IP from the request headers. Supabase puts the
 * real client IP in cf-connecting-ip (Cloudflare) or x-forwarded-for.
 * Falls back to "unknown" so rate limiting still works — all unknown-IP
 * callers just share a bucket.
 */
export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
