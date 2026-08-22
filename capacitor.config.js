
const config = {
  appId: "com.veylora.app",
  appName: "Veylora",
  webDir: "dist",

  server: {
    androidScheme: "https"
  },

  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true
    }
  },

  android: {
    allowMixedContent: true
  }
};

export default config;