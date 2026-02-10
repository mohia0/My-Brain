import type { NextConfig } from "next";

const isCapacitorBuild = process.env.IS_CAPACITOR_BUILD?.trim() === 'true';

console.log('--- NEXT CONFIG ---');
console.log('IS_CAPACITOR_BUILD:', `"${process.env.IS_CAPACITOR_BUILD}"`);
console.log('isCapacitorBuild (bool):', isCapacitorBuild);
console.log('Output Mode:', isCapacitorBuild ? 'export' : 'default');
console.log('-------------------');

const nextConfig: NextConfig = {
  reactStrictMode: false,
  output: isCapacitorBuild ? 'export' : undefined,
  distDir: isCapacitorBuild ? 'out' : '.next',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
