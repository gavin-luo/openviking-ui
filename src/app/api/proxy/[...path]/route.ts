import { NextRequest } from 'next/server'
import { ProxyAgent } from 'undici'

const TARGET_API_URL = process.env.OPENVIKING_API_URL || 'http://127.0.0.1:1933/api/v1/'
// Using proxy if configured
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY
const proxyAgent = proxyUrl ? new ProxyAgent(proxyUrl) : undefined

// Ensure TARGET_API_URL has correct format (e.g. ends with /api/v1/)
let baseApiUrl = TARGET_API_URL;
if (!baseApiUrl.endsWith('/')) {
  baseApiUrl += '/';
}
if (!baseApiUrl.includes('api/v1')) {
  baseApiUrl += 'api/v1/';
}

async function handleProxy(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  let targetUrl = ''
  try {
    const { path } = await params
    const pathname = path.join('/')
    const searchParams = req.nextUrl.searchParams.toString()
    const queryString = searchParams ? `?${searchParams}` : ''
    
    // Construct the target URL
    targetUrl = `${baseApiUrl}${pathname}${queryString}`

    // Prepare headers, injecting the API key
    const headers = new Headers(req.headers)
    headers.delete('host') // Remove the host header to avoid conflicts
    
    if (pathname.startsWith('admin') || pathname.startsWith('observer')) {
      headers.set('X-API-Key', process.env.OPENVIKING_ROOT_KEY || '')
    } else {
      const testApiKey = headers.get('x-test-api-key')
      const testAccount = headers.get('x-test-account')
      const testUser = headers.get('x-test-user')

      if (testApiKey) {
        headers.set('X-API-Key', testApiKey)
        headers.delete('x-test-api-key')
      } else {
        headers.set('X-API-Key', process.env.OPENVIKING_ROOT_KEY || '')
      }

      // If using root key for tenant APIs, we must provide account and user headers
      if (testAccount) {
        headers.set('X-OpenViking-Account', testAccount)
        headers.delete('x-test-account')
      } else if (!headers.has('X-OpenViking-Account')) {
        headers.set('X-OpenViking-Account', 'default')
      }

      if (testUser) {
        headers.set('X-OpenViking-User', testUser)
        headers.delete('x-test-user')
      } else if (!headers.has('X-OpenViking-User')) {
        headers.set('X-OpenViking-User', 'admin')
      }
    }

    // Prepare options for the fetch call
    const fetchOptions: RequestInit & { duplex?: string; dispatcher?: unknown } = {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : req.body,
      // Disable caching for the proxy
      cache: 'no-store',
      duplex: 'half',
      dispatcher: proxyAgent,
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
    console.error('Proxy error details: targetUrl =', targetUrl, 'error =', error)
    return new Response(JSON.stringify({ error: 'Internal Server Error', details: error instanceof Error ? error.message : String(error) }), {
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
