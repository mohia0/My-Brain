import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Middleware is now just a placeholder or for other logic
    // CORS is handled by vercel.json for better reliability
    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
