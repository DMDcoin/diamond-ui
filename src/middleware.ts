import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const accept = request.headers.get('accept') ?? '';
  if (accept.includes('text/markdown')) {
    return NextResponse.rewrite(new URL('/api/markdown', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/'],
};
