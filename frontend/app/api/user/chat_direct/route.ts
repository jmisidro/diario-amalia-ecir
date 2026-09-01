import { NextRequest, NextResponse } from 'next/server';

/**
 * Route Handler for POST /api/user/chat_direct
 *
 * Same rationale as /api/user/chat — bypasses the Next.js rewrite proxy
 * hardcoded 30-second timeout for long-running RAG/LLM requests.
 */

export const maxDuration = 180;

const BACKEND_URL = process.env.API_URL || 'http://backend_diario:8081';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${BACKEND_URL}/api/user/chat_direct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(175_000),
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[Route Handler] /api/user/chat_direct failed:', error?.message || error);

    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Gateway timeout', message: 'O pedido demorou demasiado tempo. Por favor, tente novamente.' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error?.message || 'Unknown error' },
      { status: 500 }
    );
  }
}
