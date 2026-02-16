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
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: isCapacitorBuild,
  },
  async headers() {
    return [
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
