import { NextResponse } from 'next/server';
import { getRichListSnapshot } from '@/lib/richListSnapshot';
import logger from '@/utils/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const snapshot = await getRichListSnapshot();
    return NextResponse.json(snapshot, {
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=60',
      },
    });
  } catch (error) {
    logger.error('[rich-list] snapshot unavailable:', error);
    return NextResponse.json({ error: 'Rich list is temporarily unavailable' }, { status: 503 });
  }
}
