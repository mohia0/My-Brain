import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mybrain.app',
  appName: 'Brainia',
  webDir: 'out',
  // Server config removed to ensure production build loads from local assets
  // server: { ... }
};

export default config;
