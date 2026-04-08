import { NextRequest } from 'next/server'

const TARGET_API_URL = 'http://127.0.0.1:1933/api/v1/'

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params
    const pathname = path.join('/')
    const searchParams = req.nextUrl.searchParams.toString()
    const queryString = searchParams ? `?${searchParams}` : ''
    
    // Construct the target URL
    const targetUrl = `${TARGET_API_URL}${pathname}${queryString}`

    // Prepare headers, injecting the API key
    const headers = new Headers(req.headers)
    headers.delete('host') // Remove the host header to avoid conflicts
    headers.set('X-API-Key', process.env.OPENVIKING_ROOT_KEY || '')

    // Read body as ArrayBuffer to support all content types
    let body: ArrayBuffer | undefined = undefined
    if (!['GET', 'HEAD'].includes(req.method)) {
      body = await req.arrayBuffer()
    }

    // Prepare options for the fetch call
    const fetchOptions: RequestInit = {
      method: req.method,
      headers,
      body,
      // Disable caching for the proxy
      cache: 'no-store',
    }

    const response = await fetch(targetUrl, fetchOptions)

    // Create a new response with the target's body, status, and headers
    const responseHeaders = new Headers(response.headers)
    
    // Fix content-encoding issue by deleting it, allowing Next.js to handle compression
    responseHeaders.delete('content-encoding')
    responseHeaders.delete('content-length')
    
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Proxy error:', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export const GET = handleProxy
export const POST = handleProxy
export const PUT = handleProxy
export const DELETE = handleProxy
export const PATCH = handleProxy