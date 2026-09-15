import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.smartrun.app',
  appName: 'SmartRun',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true,
    allowNavigation: [
      'smartrun.in',
      'www.smartrun.in',
      'www.girirajpower.in',
      'girirajpower.in',
      '*.razorpay.com',
      'api.razorpay.com',
      'checkout.razorpay.com',
      '*.run.app',
      '*.supabase.co',
      '*.googleapis.com',
      '*.gstatic.com',
      '*.googletagmanager.com',
      'unpkg.com',
      'images.unsplash.com',
      'i.imgur.com'
    ],
  },
  plugins: {
    App: {
      // Custom URL scheme deep link handling (buildnow://product/:id)
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#F9C017',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#F9C017',
    },
  },
};

export default config;

