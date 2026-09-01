import { NextRequest, NextResponse } from 'next/server';

/**
 * Route Handler for POST /api/user/chat
 *
 * Why this exists:
 * The Next.js rewrite proxy (next.config.js `rewrites`) has a hardcoded
 * 30-second timeout that cannot be overridden via config. RAG chat requests
 * can take 30-90s depending on LLM load, so they always hit this limit and
 * return a 500 "socket hang up" / ECONNRESET to the client.
 *
 * This Route Handler bypasses the rewrite proxy entirely and makes the
 * backend request server-side with a 3-minute AbortSignal timeout.
 */

// Tell Next.js this route can run longer than the default 30s
export const maxDuration = 180;

const BACKEND_URL = process.env.API_URL || 'http://backend_diario:8081';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch(`${BACKEND_URL}/api/user/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(175_000), // 175s — just under the 3-min maxDuration
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error: any) {
    console.error('[Route Handler] /api/user/chat failed:', error?.message || error);

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
