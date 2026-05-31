import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // We handle rate limiting inside the routes themselves, 
  // so this middleware should just pass through.
  return NextResponse.next()
}

export const config = {
  // Ensure this doesn't accidentally block the UI
  matcher: '/api/:path*',
}