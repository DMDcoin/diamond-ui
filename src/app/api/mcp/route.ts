import { NextRequest, NextResponse } from 'next/server';
import { CURR_VERSION_INFO } from '@/constants/version';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { jsonrpc, id, method } = body;

  if (jsonrpc !== '2.0') {
    return NextResponse.json(
      { jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } },
      { status: 400 }
    );
  }

  if (method === 'initialize') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: process.env.NEXT_PUBLIC_CHAIN_NAME ?? 'Diamond UI', version: CURR_VERSION_INFO.version },
      },
    });
  }

  return NextResponse.json(
    { jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } },
    { status: 404 }
  );
}
