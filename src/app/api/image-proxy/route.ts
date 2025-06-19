
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
  }

  try {
    // Basic validation of the URL to prevent SSRF attempts, though more robust validation might be needed for production.
    const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
    if (!urlPattern.test(imageUrl)) {
        return NextResponse.json({ error: 'Invalid image URL format' }, { status: 400 });
    }
    
    const parsedUrl = new URL(imageUrl);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        return NextResponse.json({ error: 'URL protocol must be HTTP or HTTPS' }, { status: 400 });
    }


    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'VisionarySuite-ImageProxy/1.0',
      },
      redirect: 'follow', // Follow redirects
      signal: AbortSignal.timeout(15000), // Timeout after 15 seconds
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch image: ${response.status} ${response.statusText}` }, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'URL does not point to a valid image type.' }, { status: 400 });
    }

    const imageBuffer = await response.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600, immutable', // Cache for 1 hour
      },
    });

  } catch (error) {
    console.error('Image proxy error:', error);
    let errorMessage = 'Failed to proxy image.';
    if (error instanceof Error) {
        if (error.name === 'AbortError') {
            errorMessage = 'The request to fetch the image timed out.';
            return NextResponse.json({ error: errorMessage }, { status: 504 }); // Gateway Timeout
        }
        errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
