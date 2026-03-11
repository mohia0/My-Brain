import type { NextConfig } from "next";

const isCapacitorBuild = process.env.IS_CAPACITOR_BUILD?.trim() === 'true' && !process.env.VERCEL && !process.env.VERCEL_URL;

console.log('--- NEXT CONFIG ---');
console.log('IS_CAPACITOR_BUILD (env):', `"${process.env.IS_CAPACITOR_BUILD}"`);
console.log('VERCEL (env):', process.env.VERCEL);
console.log('isCapacitorBuild (final bool):', isCapacitorBuild);
console.log('Output Mode:', isCapacitorBuild ? 'export' : 'default (api supported)');
console.log('-------------------');

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: isCapacitorBuild ? 'export' : undefined,
  distDir: isCapacitorBuild ? 'out' : '.next',
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: isCapacitorBuild,
  },

  async headers() {
    const cspHeader = `
      default-src 'self' https://*.supabase.co wss://*.supabase.co;
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' blob: data: https:;
      font-src 'self' https://fonts.gstatic.com;
      object-src 'none';
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
      upgrade-insecure-requests;
    `;

    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: cspHeader.replace(/\n/g, "").replace(/\s+/g, " ").trim(),
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, X-Requested-With" },
        ]
      }
    ]
  },
};

export default nextConfig;
