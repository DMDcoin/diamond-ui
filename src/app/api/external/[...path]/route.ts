/**
 * Next.js API Route - External API Proxy
 * Proxies requests to external backend API with Bearer token
 * This runs on the server and never exposes the API token to the client
 */

import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import { makeApiRequest } from '@/lib/serverApiClient';
import logger from '@/utils/logger';


// IP Rate Limiting — Redis with in-memory fallback
const RATE_LIMIT = parseInt(process.env.BFF_RATE_LIMIT_PER_MINUTE || '200', 10);

type MemEntry = { count: number; expiresAt: number };
const memStore = new Map<string, MemEntry>();

let redisClient: Redis | null = null;
let useFallback = false;
let fallbackLogged = false;

function markFallback(): void {
  if (!fallbackLogged) {
    console.warn(
      '[rate-limit] Redis unavailable — falling back to in-memory store. ' +
        'Rate limiting will not persist across restarts or instances.'
    );
    fallbackLogged = true;
  }
  useFallback = true;
}

// Attempt Redis connection once at module load
const initPromise: Promise<void> = (async () => {
  try {
    const client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      connectTimeout: 3000,
      maxRetriesPerRequest: 0,
      enableReadyCheck: false,
    });
    client.on('error', () => {});
    await client.connect();
    redisClient = client;
  } catch {
    markFallback();
  }
})();

function getClientIp(request: NextRequest): string {
  // cf-connecting-ip: set by Cloudflare
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) return cfIp.trim();

  // x-real-ip: set by nginx via `proxy_set_header X-Real-IP $remote_addr`
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // x-forwarded-for fallback — only reliable in dev (no proxy in front)
  const xff = request.headers.get('x-forwarded-for');
  if (!xff) return 'unknown';
  return xff.split(',')[0].trim() || 'unknown';
}

async function checkRateLimit(
  request: NextRequest
): Promise<{ allowed: boolean; remaining: number }> {
  // Wait for Redis init to settle before deciding which store to use.
  await initPromise;

  const ip = getClientIp(request);
  const key = `bff:ratelimit:${ip}:minute`;

  if (!useFallback && redisClient) {
    try {
      const count: number = await redisClient.incr(key);
      if (count === 1) {
        await redisClient.expire(key, 60);
      }
      const remaining = Math.max(0, RATE_LIMIT - count);
      return { allowed: count <= RATE_LIMIT, remaining };
    } catch (err) {
      logger.warn('[rate-limit] Redis error during request — failing open:', err);
      return { allowed: true, remaining: 0 };
    }
  }

  // In-memory fallback: lazy expiry on access.
  const now = Date.now();
  const entry = memStore.get(key);
  if (!entry || entry.expiresAt <= now) {
    memStore.set(key, { count: 1, expiresAt: now + 60_000 });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  entry.count++;
  const remaining = Math.max(0, RATE_LIMIT - entry.count);
  return { allowed: entry.count <= RATE_LIMIT, remaining };
}

// Allow-list of upstream endpoints
const HEX_ADDRESS = '0x[a-fA-F0-9]{40}';
const ALLOWED_ENDPOINTS: { method: string; pattern: RegExp }[] = [
  { method: 'GET', pattern: new RegExp(`^node/${HEX_ADDRESS}/bonus-score-reasons-history/?$`) },
  { method: 'GET', pattern: new RegExp(`^node/${HEX_ADDRESS}/(stake-transactions|epoch-rewards|epoch-rewards/daily|reward-stats)$`) },
  { method: 'GET', pattern: new RegExp(`^staker/${HEX_ADDRESS}/(stake-transactions|rewards|reward-stats)$`) },
  { method: 'POST', pattern: /^nodes\/reward-stats$/ },
  { method: 'GET', pattern: new RegExp(`^owner/${HEX_ADDRESS}/names/?$`) },
  { method: 'GET', pattern: /^name\/[a-z0-9-]+\/history\/?$/ },
  { method: 'GET', pattern: /^names\/blacklisted\/?$/ },
  { method: 'GET', pattern: /^names\/?$/ },
];

function isAllowedRequest(method: string, path: string): boolean {
  return ALLOWED_ENDPOINTS.some((e) => e.method === method && e.pattern.test(path));
}

/**
 * Handle GET requests
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');

    if (!isAllowedRequest('GET', path)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { allowed, remaining } = await checkRateLimit(request);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    logger.log(`[API Route] GET request for path: ${path}`);
    
    // Extract query parameters from the URL
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    // Construct the full endpoint with query parameters
    const endpoint = queryString ? `${path}?${queryString}` : path;
    
    logger.log(`[API Route] Full endpoint: ${endpoint}`);
    
    // Make request to external API with Bearer token
    const response = await makeApiRequest(endpoint, {
      method: 'GET',
    });
    
    logger.log(`[API Route] Response: ${response.ok ? 'OK' : 'ERROR'}, Status: ${response.status}`);
    
    // Return the response to the client
    if (response.ok) {
      return NextResponse.json(response.data, {
        status: response.status,
        headers: { 'X-RateLimit-Remaining': String(remaining) },
      });
    } else {
      return NextResponse.json(
        { error: 'External API request failed', details: response.data },
        { status: response.status, headers: { 'X-RateLimit-Remaining': String(remaining) } }
      );
    }
  } catch (error) {
    logger.error('API route error:', error);
    
    // Return error
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle POST requests
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params before accessing properties
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');

    if (!isAllowedRequest('POST', path)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);

    const response = await makeApiRequest(path, {
      method: 'POST',
      body,
    });
    
    if (response.ok) {
      return NextResponse.json(response.data, { status: response.status });
    } else {
      return NextResponse.json(
        { error: 'External API request failed', details: response.data },
        { status: response.status }
      );
    }
  } catch (error) {
    logger.error('API route error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle PUT requests
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params before accessing properties
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');

    if (!isAllowedRequest('PUT', path)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);

    const response = await makeApiRequest(path, {
      method: 'PUT',
      body,
    });
    
    if (response.ok) {
      return NextResponse.json(response.data, { status: response.status });
    } else {
      return NextResponse.json(
        { error: 'External API request failed', details: response.data },
        { status: response.status }
      );
    }
  } catch (error) {
    logger.error('API route error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Handle DELETE requests
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    // Await params before accessing properties
    const { path: pathSegments } = await params;
    const path = pathSegments.join('/');

    if (!isAllowedRequest('DELETE', path)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const response = await makeApiRequest(path, {
      method: 'DELETE',
    });
    
    if (response.ok) {
      return NextResponse.json(response.data, { status: response.status });
    } else {
      return NextResponse.json(
        { error: 'External API request failed', details: response.data },
        { status: response.status }
      );
    }
  } catch (error) {
    logger.error('API route error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
