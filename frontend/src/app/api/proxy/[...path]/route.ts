import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://finance-tracker-alb-996193229.ap-southeast-1.elb.amazonaws.com';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'DELETE');
}

export async function OPTIONS(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  return handleRequest(request, params, 'OPTIONS');
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    // Await params to comply with Next.js 15 requirements
    const { path: pathArray } = await params;
    const path = pathArray.join('/');
    // The path already includes 'api', so we construct the full URL
    // Django expects trailing slashes for most endpoints
    const pathWithSlash = path.endsWith('/') ? path : `${path}/`;
    const url = `${BACKEND_URL}/${pathWithSlash}`;
    
    // Get search params from the original request
    const searchParams = request.nextUrl.searchParams;
    const fullUrl = searchParams.toString() 
      ? `${url}?${searchParams.toString()}` 
      : url;

    // Prepare headers - copy all important headers from the original request
    const headers: HeadersInit = {};

    // Copy content-type if present
    const contentType = request.headers.get('content-type');
    if (contentType) {
      headers['Content-Type'] = contentType;
    } else if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      headers['Content-Type'] = 'application/json';
    }

    // Forward authorization header if present
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['Authorization'] = authHeader;
    }

    // Forward other important headers
    const userAgent = request.headers.get('user-agent');
    if (userAgent) {
      headers['User-Agent'] = userAgent;
    }

    // Forward accept header
    const accept = request.headers.get('accept');
    if (accept) {
      headers['Accept'] = accept;
    }

    // Forward x-requested-with header
    const xRequestedWith = request.headers.get('x-requested-with');
    if (xRequestedWith) {
      headers['X-Requested-With'] = xRequestedWith;
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers,
    };

    // Add body for non-GET requests
    if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
      try {
        const body = await request.text();
        if (body) {
          requestOptions.body = body;
        }
      } catch (error) {
        console.warn('Failed to read request body:', error);
      }
    }

    // Log proxy requests for debugging
    console.log(`Proxying ${method} ${fullUrl}`);

    // Make the request to the backend
    const response = await fetch(fullUrl, requestOptions);

    // Get response body and handle different content types
    const responseContentType = response.headers.get('content-type');
    let responseBody;
    let isJson = false;
    
    if (responseContentType?.includes('application/json')) {
      try {
        responseBody = await response.json();
        isJson = true;
      } catch {
        responseBody = await response.text();
        isJson = false;
      }
    } else {
      responseBody = await response.text();
      isJson = false;
    }

    // Create response with proper content type
    let nextResponse;
    if (isJson) {
      nextResponse = NextResponse.json(responseBody, {
        status: response.status,
        statusText: response.statusText,
      });
    } else {
      nextResponse = new NextResponse(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          'Content-Type': responseContentType || 'text/plain',
        },
      });
    }

    // Add CORS headers
    nextResponse.headers.set('Access-Control-Allow-Origin', '*');
    nextResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    nextResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    nextResponse.headers.set('Access-Control-Allow-Credentials', 'true');

    // Forward important response headers
    const locationHeader = response.headers.get('location');
    if (locationHeader) {
      nextResponse.headers.set('Location', locationHeader);
    }

    return nextResponse;

  } catch (error) {
    console.error('Proxy error:', error);
    
    return NextResponse.json(
      { 
        error: 'Proxy request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: 'Failed to connect to backend service'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        }
      }
    );
  }
}
