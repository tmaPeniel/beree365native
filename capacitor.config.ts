import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f27fcb771f7c4b7c8610d0860593b05d',
  appName: 'beree-365',
  webDir: 'dist',
  server: {
    androidScheme: "https",
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
