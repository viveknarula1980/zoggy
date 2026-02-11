// Next.js API route proxy for admin games endpoint (root path)
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return handleRequest(request, 'GET');
}

export async function POST(request: NextRequest) {
  return handleRequest(request, 'POST');
}

export async function PUT(request: NextRequest) {
  return handleRequest(request, 'PUT');
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request, 'DELETE');
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

async function handleRequest(request: NextRequest, method: string) {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_HTTP ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      '';

    if (!backendUrl) {
      return NextResponse.json(
        { error: 'Backend URL not configured' },
        { status: 500 }
      );
    }

    // Root path: /admin/games
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullPath = queryString ? `/admin/games?${queryString}` : '/admin/games';

    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      // Remove browser-specific headers that could cause CORS issues
      if (
        lowerKey !== 'host' &&
        lowerKey !== 'connection' &&
        lowerKey !== 'content-length' &&
        lowerKey !== 'origin' &&  // Remove origin to avoid CORS issues
        lowerKey !== 'referer' &&  // Remove referer
        lowerKey !== 'user-agent' &&  // Optional: remove user-agent if backend doesn't need it
        !lowerKey.startsWith('sec-')  // Remove security headers (sec-fetch-*, etc.)
      ) {
        headers[key] = value;
      }
    });

    const backendResponse = await fetch(`${backendUrl}${fullPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body || undefined,
    });

    const responseData = await backendResponse.text();
    let jsonData: any;
    try {
      jsonData = JSON.parse(responseData);
    } catch {
      jsonData = responseData;
    }

    return NextResponse.json(jsonData, {
      status: backendResponse.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error: any) {
    console.error('[API Proxy] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Proxy request failed' },
      { status: 500 }
    );
  }
}

