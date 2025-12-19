/// <reference types="@capacitor-firebase/authentication" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nottai.app',
  appName: 'nottai',
  webDir: 'dist',
  android: {
    loggingBehavior: 'debug'
  },
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: []
    }
  }
};

export default config;
