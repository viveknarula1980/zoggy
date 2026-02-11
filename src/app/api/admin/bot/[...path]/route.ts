// Next.js API route proxy for admin bot endpoints
// This avoids CORS issues by proxying requests through the Next.js server
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PUT');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'DELETE');
}

export async function OPTIONS() {
  // Handle CORS preflight
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

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
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

    // Reconstruct the path
    // params.path is an array like ['recent'] or ['config']
    const pathSegments = Array.isArray(params.path) ? params.path : [params.path].filter(Boolean);
    const backendPath = `/admin/bot/${pathSegments.join('/')}`;
    
    // Get query string from request
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${backendPath}?${queryString}` : backendPath;

    // Get request body if present
    let body: string | undefined;
    if (method !== 'GET' && method !== 'DELETE') {
      try {
        body = await request.text();
      } catch {
        // No body
      }
    }

    // Get headers from request
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      // Forward relevant headers, but skip host and connection
      if (
        key.toLowerCase() !== 'host' &&
        key.toLowerCase() !== 'connection' &&
        key.toLowerCase() !== 'content-length'
      ) {
        headers[key] = value;
      }
    });

    // Make request to backend
    const backendResponse = await fetch(`${backendUrl}${fullPath}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body || undefined,
    });

    // Get response data
    const responseData = await backendResponse.text();
    let jsonData: any;
    try {
      jsonData = JSON.parse(responseData);
    } catch {
      jsonData = responseData;
    }

    // Return response with CORS headers
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

