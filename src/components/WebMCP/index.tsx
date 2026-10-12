'use client';

import { useEffect } from 'react';
import config from '@/lib/config';

export default function WebMCP() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.modelContext) return;

    const registrations = [
      navigator.modelContext.registerTool({
        name: 'navigate',
        description: 'Navigate to a page on the Diamond UI.',
        inputSchema: {
          type: 'object',
          properties: {
            page: {
              type: 'string',
              enum: ['home', 'validators', 'dao', 'faqs', 'profile'],
            },
          },
          required: ['page'],
        },
        execute: async (params) => {
          const { page } = params as { page: string };
          const routes: Record<string, string> = {
            home: '/',
            validators: '/validators',
            dao: '/dao',
            faqs: '/faqs',
            profile: '/profile',
          };
          const path = routes[page] ?? '/';
          window.location.href = path;
          return { navigated: page };
        },
      }),

      navigator.modelContext.registerTool({
        name: 'get-network-stats',
        description: 'Returns chain and contract config for the DMD network.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => {
          const siteUrl = config.siteUrl || 'https://ui2.bit.diamonds';
          const res = await fetch(`${siteUrl}/api/config`);
          if (!res.ok) throw new Error('Failed to fetch network config');
          return res.json();
        },
      }),

      navigator.modelContext.registerTool({
        name: 'get-validators',
        description: 'Returns the URL for the validator list page.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({ url: `${config.siteUrl || 'https://ui2.bit.diamonds'}/validators` }),
      }),

      navigator.modelContext.registerTool({
        name: 'get-dao-proposals',
        description: 'Returns the URL for the DAO governance page.',
        inputSchema: { type: 'object', properties: {} },
        execute: async () => ({ url: `${config.siteUrl || 'https://ui2.bit.diamonds'}/dao` }),
      }),
    ];

    return () => {
      registrations.forEach((r) => r.unregister());
    };
  }, []);

  return null;
}
