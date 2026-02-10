import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mybrain.app',
  appName: 'Brainia',
  webDir: 'out',
  server: process.env.IS_CAPACITOR_BUILD === 'true' ? undefined : {
    url: 'http://192.168.1.237:3000',
    cleartext: true
  }
};

export default config;
