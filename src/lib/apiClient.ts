/**
 * Client-side API Client
 * Handles communication with Next.js API routes (which proxy to external API)
 * This code runs in the browser and NEVER contains API tokens
 */

'use client';

import { toast } from 'react-toastify';
import logger from '@/utils/logger';

export interface ClientApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ClientApiResponse<T = any> {
  data: T;
  status: number;
  ok: boolean;
  error?: string;
  rateLimited?: boolean;
}

/**
 * Make a request to Next.js API route (which proxies to external API)
 * @param endpoint - API endpoint (e.g., 'node/0x123/bonus-score-reasons-history/')
 * @param options - Request options
 * @returns Promise with API response
 */
export async function makeClientApiRequest<T = any>(
  endpoint: string,
  options: ClientApiRequestOptions = {}
): Promise<ClientApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = 30000,
  } = options;

  // Ensure endpoint doesn't start with slash
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // Construct URL to internal API route (not external API)
  const url = `/api/external/${cleanEndpoint}`;

  // Prepare headers (NO Bearer token - handled by server)
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Prepare fetch options
  const fetchOptions: RequestInit = {
    method,
    headers: requestHeaders,
  };

  // Add body for non-GET requests
  if (body && method !== 'GET') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Create abort controller for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  fetchOptions.signal = controller.signal;

  try {
    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    let data: T;
    const contentType = response.headers.get('content-type');

    if (response.status === 429) {
      toast.warn(
        "You're sending requests a bit too fast. Please wait a moment and try again.",
        {
          toastId: 'rate-limit',
          autoClose: 8000,
        }
      );
      return {
        data: {} as T,
        status: 429,
        ok: false,
        rateLimited: true,
      };
    }

    if (contentType && contentType.includes('application/json')) {
      const jsonData = await response.json();
      
      // Check if response contains error from API route
      if (!response.ok && jsonData.error) {
        return {
          data: jsonData as T,
          status: response.status,
          ok: false,
          error: jsonData.error,
        };
      }
      
      data = jsonData;
    } else {
      data = await response.text() as any;
    }

    return {
      data,
      status: response.status,
      ok: response.ok,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    
    logger.error('Client API request failed:', error);
    throw error;
  }
}

/**
 * GET request helper
 */
export async function clientApiGet<T = any>(
  endpoint: string,
  options?: Omit<ClientApiRequestOptions, 'method' | 'body'>
): Promise<ClientApiResponse<T>> {
  return makeClientApiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request helper
 */
export async function clientApiPost<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<ClientApiRequestOptions, 'method' | 'body'>
): Promise<ClientApiResponse<T>> {
  return makeClientApiRequest<T>(endpoint, { ...options, method: 'POST', body });
}

/**
 * PUT request helper
 */
export async function clientApiPut<T = any>(
  endpoint: string,
  body?: any,
  options?: Omit<ClientApiRequestOptions, 'method' | 'body'>
): Promise<ClientApiResponse<T>> {
  return makeClientApiRequest<T>(endpoint, { ...options, method: 'PUT', body });
}

/**
 * DELETE request helper
 */
export async function clientApiDelete<T = any>(
  endpoint: string,
  options?: Omit<ClientApiRequestOptions, 'method' | 'body'>
): Promise<ClientApiResponse<T>> {
  return makeClientApiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Privacy-aware API client
 * Throws an error if called when privacy mode is active
 */
export async function privacyAwareApiRequest<T = any>(
  endpoint: string,
  options: ClientApiRequestOptions = {},
  isPrivacyMode: boolean = false
): Promise<ClientApiResponse<T>> {
  if (isPrivacyMode) {
    throw new Error('API calls are disabled in Privacy Mode');
  }
  
  return makeClientApiRequest<T>(endpoint, options);
}
