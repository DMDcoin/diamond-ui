/**
 * Server-side API Client
 * Handles communication with external backend API
 * This code runs ONLY on the server and has access to API tokens
 */

import logger from '@/utils/logger';

const DB_API_BASE_URL = process.env.DB_API_BASE_URL || 'http://localhost:4000';
const DB_API_TOKEN = process.env.DB_API_TOKEN || '';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3003';

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
}

/**
 * Make a request to the external API with Bearer token
 * @param endpoint - API endpoint (e.g., 'node/0x123/bonus-score-reasons-history/')
 * @param options - Request options
 * @returns Promise with API response
 */
export async function makeApiRequest<T = any>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = 30000,
  } = options;

  // Ensure endpoint doesn't start with slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;

  // Construct full URL
  const base = DB_API_BASE_URL.endsWith('/') ? DB_API_BASE_URL : `${DB_API_BASE_URL}/`;
  const url = `${base}${cleanEndpoint}`;

  // Prepare headers with Bearer token and required Origin/Referer
  const requestHeaders: Record<string, string> = {
    'Authorization': `Bearer ${DB_API_TOKEN}`,
    'Content-Type': 'application/json',
    'Origin': SITE_URL,
    'Referer': SITE_URL,
    ...headers,
  };

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
    signal: AbortSignal.timeout(timeout),
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  try {
    const response = await fetch(url, fetchOptions);
    
    let data: T;
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text() as any;
    }

    return {
      data,
      status: response.status,
      ok: response.ok,
    };
  } catch (error) {
    logger.error('Server API request failed:', error);
    throw error;
  }
}

/**
 * GET request helper
 */
export async function apiGet<T = any>(
  endpoint: string,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return makeApiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return makeApiRequest<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * PUT request helper
 */
export async function apiPut<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return makeApiRequest<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * DELETE request helper
 */
export async function apiDelete<T = any>(
  endpoint: string,
  options?: Omit<ApiRequestOptions, 'method' | 'body'>
): Promise<ApiResponse<T>> {
  return makeApiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Health check for external API
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await makeApiRequest('health', { timeout: 5000 });
    return response.ok;
  } catch {
    return false;
  }
}
