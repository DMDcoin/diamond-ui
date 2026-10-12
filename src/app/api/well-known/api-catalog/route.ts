import { NextResponse } from 'next/server';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://ui2.bit.diamonds').replace(/\/$/, '');

export async function GET() {
  const catalog = {
    linkset: [
      {
        anchor: `${SITE_URL}`,
        "describedby": [{ href: `${SITE_URL}/.well-known/agent-skills/index.json`, type: 'application/json' }],
      },
      {
        anchor: `${SITE_URL}/api/external`,
        "service-doc": [{ href: `${SITE_URL}/api/external` }],
      },
    ],
  };

  return new NextResponse(JSON.stringify(catalog), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
