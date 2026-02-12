# Mobile App API Integration & CORS Resolution

This document summarizes the technical configuration required to allow the Capacitor-based mobile app to communicate with the Next.js API hosted on Vercel.

## 1. Production API Configuration
The mobile app must point to the production Vercel URL when running on a native platform.
- **Environment Variable**: `NEXT_PUBLIC_API_URL` should be set to `https://www.brainia.space`.
- **Fallback Implementation**: In `components/Mobile/MobilePageContent.tsx`, the `API_BASE` defaults to this URL if the env var is missing.

## 2. Global CORS Strategy (Server-Side)
To allow requests from `https://localhost` (the Capacitor origin), CORS must be handled globally on Vercel.
- **`next.config.ts`**: Implements a global `headers()` function that injects `Access-Control-Allow-Origin: *` and related headers for all `/api/:path*` routes.
- **Middleware**: Manual CORS handling was **removed** from `middleware.ts` to prevent "multiple Allow-Origin headers" errors.

## 3. Preflight (OPTIONS) Handling
Vercel's API routes require explicit handling of `OPTIONS` requests to avoid `405 Method Not Allowed` errors during CORS preflight checks.
- **Implementation**: Each relevant API route (e.g., `api/metadata/route.ts`, `api/screenshot/route.ts`) exports an `OPTIONS` handler that returns a `204 No Content` status.

## 4. Mobile Build Workflow (`mobile-build.js`)
Since Next.js cannot export static HTML if server-side API routes (`app/api/*`) or middleware are present, a dedicated build script was created.
- **Script**: `scripts/mobile-build.js`
- **Workflow**:
  1. Temporarily renames `app/api` and `middleware.ts` (hiding them from the static build).
  2. Sets `IS_CAPACITOR_BUILD=true`.
  3. Runs `npm run build` (Next.js generates a static export in `out/`).
  4. Runs `npx cap sync`.
  5. Restores the hidden files for local development.

## 5. Deployment Reminder
Any changes to the API logic or CORS headers MUST be pushed to GitHub to trigger a Vercel redeployment before they take effect for the mobile app.
