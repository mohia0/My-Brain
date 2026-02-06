import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mybrain.app',
  appName: 'Brainia',
  webDir: 'out',
  server: {
    url: 'http://192.168.1.237:3000', // Your computer's IP
    cleartext: true
  }
};

export default config;
