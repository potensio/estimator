import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getCurrentUser } from './lib/auth'

// Routes that require authentication
const protectedRoutes = ['/projects', '/estimates', '/workspace']

// Routes that should redirect to projects if user is authenticated
const authRoutes = ['/login', '/signup']

// Public routes that don't require authentication
const publicRoutes = ['/', '/api/auth/signup', '/api/auth/login', '/api/auth/logout']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  // Get current user
  const user = await getCurrentUser(request)
  
  // Check if route requires authentication
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  
  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
  
  // Redirect to projects if accessing auth routes while authenticated
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/projects', request.url))
  }
  
  // Add user info to headers for server components
  if (user) {
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', user.userId)
    requestHeaders.set('x-user-email', user.email)
    if (user.workspaceId) {
      requestHeaders.set('x-workspace-id', user.workspaceId)
    }
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}