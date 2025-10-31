import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Skip session validation for static assets and API routes to improve performance
  if (
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.includes('.') // Skip files with extensions
  ) {
    return supabaseResponse;
  }

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Define public routes that don't require authentication
  const publicRoutes = [
    '/auth/login',
    '/auth/register',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/onboarding',
    '/auth/invitation',
    '/auth/callback',
    '/auth/auth-code-error',
    '/health',
    '/api/health'
  ];

  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // Debug logging
  if (request.nextUrl.pathname.includes('/invitation')) {
    console.log('Middleware: Processing invitation route:', request.nextUrl.pathname);
    console.log('Middleware: Is public route:', isPublicRoute);
    console.log('Middleware: User exists:', !!user);
  }

  // Redirect unauthenticated users to login (except for public routes)
  if (!user && !isPublicRoute) {
    // Only redirect if not already on login page to prevent loops
    if (request.nextUrl.pathname !== '/auth/login') {
      console.log('Middleware: Redirecting to login from:', request.nextUrl.pathname);
      const url = request.nextUrl.clone();
      url.pathname = '/auth/login';
      return NextResponse.redirect(url);
    }
  }

  // For authenticated users, check onboarding status before accessing protected routes
  // Only check onboarding on initial navigation, not on every request
  if (user && !isPublicRoute && 
      !request.nextUrl.pathname.startsWith('/auth/onboarding') &&
      !request.headers.get('x-middleware-rewrite') && // Skip if this is a rewrite
      request.nextUrl.pathname === '/dashboard') { // Only check on dashboard access
    try {
      // Check if user has completed onboarding (has memberships)
      const { data: memberships, error } = await supabase
        .from('memberships')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      if (error) {
        console.error('Error checking memberships in middleware:', error);
      }

      // If user has no memberships, redirect to onboarding
      if (!memberships || memberships.length === 0) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/onboarding';
        return NextResponse.redirect(url);
      }
    } catch (error) {
      console.error('Error in onboarding check:', error);
      // On error, allow access but log the issue
    }
  }

  // Redirect authenticated users away from auth pages (except callback, error, onboarding, and invitation pages)
  if (user && (
    request.nextUrl.pathname.startsWith('/auth/login') ||
    request.nextUrl.pathname.startsWith('/auth/register') ||
    request.nextUrl.pathname.startsWith('/auth/forgot-password')
  )) {
    // Only redirect if not already on dashboard to prevent loops
    if (!request.nextUrl.pathname.startsWith('/dashboard')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}
