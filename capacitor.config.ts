import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.santoti.mothersteam',
  appName: "Mother's Team",
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
