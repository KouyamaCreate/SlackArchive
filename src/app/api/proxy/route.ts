import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  const token = searchParams.get('token');

  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      return new NextResponse(`Failed to fetch from Slack: ${response.status} ${response.statusText}`, { status: response.status });
    }

    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    return new NextResponse(blob, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });

  } catch (error) {
    console.error('Proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
