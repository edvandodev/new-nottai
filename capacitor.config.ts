import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nottai.app',
  appName: 'nottai',
  webDir: 'dist',
  android: {
    loggingBehavior: 'debug'
  }
};

export default config;
