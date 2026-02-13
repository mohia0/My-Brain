import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        "/((?!api/|_next/|_static/|[\\w-]+\\.\\w+).*)",
    ],
};

export default function middleware(req: NextRequest) {
    const url = req.nextUrl;
    const hostname = req.headers.get("host") || "";

    // Define our domains
    // You might want to use environment variables for flexibility
    const mainDomain = "brainia.space";
    // The app domain just passes through to the root app naturally.

    // If we are on the main marketing domain, rewrite the root path to /home
    // This means visitors to brainia.space see the contents of app/home/page.tsx
    // while the URL remains brainia.space/
    if (hostname === mainDomain && url.pathname === '/') {
        return NextResponse.rewrite(new URL('/home', req.url));
    }

    // For app.brainia.space or localhost, we do nothing.
    // They just see the default root app (the canvas).
    return NextResponse.next();
}
