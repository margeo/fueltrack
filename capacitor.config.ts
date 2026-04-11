import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.fueltrack.app',
  appName: 'FuelTrack',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
