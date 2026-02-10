import type { NextConfig } from "next";

const isCapacitorBuild = process.env.IS_CAPACITOR_BUILD === 'true';

console.log('--- NEXT CONFIG ---');
console.log('IS_CAPACITOR_BUILD:', process.env.IS_CAPACITOR_BUILD);
console.log('Output Mode:', isCapacitorBuild ? 'export' : 'default');
console.log('-------------------');

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: isCapacitorBuild ? 'export' : undefined,
  distDir: isCapacitorBuild ? 'out' : '.next',
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  }
};

export default nextConfig;
