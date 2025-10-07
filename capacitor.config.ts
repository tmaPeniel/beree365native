import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.f27fcb771f7c4b7c8610d0860593b05d',
  appName: 'beree-365',
  webDir: 'dist',
  server: {
    url: 'https://f27fcb77-1f7c-4b7c-8610-d0860593b05d.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    }
  }
};

export default config;
