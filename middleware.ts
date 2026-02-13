import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const hostname = request.headers.get('host') || '';

    // Define your domains (you can also use environment variables here)
    const rootDomain = 'brainia.space';
    const appDomain = 'app.brainia.space';

    // 1. Handle API routes, static files, and internal paths (skip these)
    if (
        url.pathname.startsWith('/_next') ||
        url.pathname.startsWith('/api') ||
        url.pathname.startsWith('/static') ||
        url.pathname.includes('.') // for favicon.ico, etc.
    ) {
        return NextResponse.next();
    }

    // 2. Logic for root domain (brainia.space)
    // If the user visits the root domain, we show the landing page (/home)
    if (hostname === rootDomain || hostname === `www.${rootDomain}`) {
        if (url.pathname === '/') {
            url.pathname = '/home';
            return NextResponse.rewrite(url);
        }
        // If they explicitly visit /home, redirect to root for a cleaner URL
        if (url.pathname === '/home') {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // 3. Logic for app subdomain (app.brainia.space)
    // The app is already at the root (/), so we just let it pass through.
    // We can also add secondary verification here if needed.
    if (hostname === appDomain) {
        // If someone tries to access /home on the app subdomain, redirect them to root
        if (url.pathname === '/home') {
            url.pathname = '/';
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
