import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fitinn.mahlzeit',
  appName: 'Mahlzeit!',
  webDir: 'out',
  
  // Server URL für Development & Production
  server: {
    url: 'https://fitinn-nutrition.vercel.app',
    cleartext: true
  },
  
  // iOS-spezifische Einstellungen
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
    scrollEnabled: true,
    scheme: 'Mahlzeit',
  },
  
  // Android-spezifische Einstellungen
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  
  // Plugins
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#14B8A6', // Teal-500
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#14B8A6',
    },
  },
};

export default config;
