import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mybrain.app',
  appName: 'Brainia',
  webDir: 'public', // Use public as placeholder since we use server.url for dev
  server: {
    url: 'http://10.0.2.2:3000',
    cleartext: true
  }
};

export default config;
