import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'me.fueltrack.app',
  appName: 'FuelTrack',
  webDir: 'dist',
  server: {
    // Load the WebView directly from the production domain so web
    // changes pushed to main appear in the native app as soon as
    // Netlify finishes deploying — no local rebuild / cap sync / Run
    // cycle needed to test iterations during development.
    //
    // NOTE: remove `url` before shipping to Play Store / App Store.
    // Store reviewers treat WebView wrappers around a remote site
    // as "thin client" apps and often reject them. When we prepare
    // the signed release build we'll drop this line so the app
    // ships with the bundled dist/ instead.
    url: 'https://fueltrack.me',
    androidScheme: 'https'
  }
};

export default config;
