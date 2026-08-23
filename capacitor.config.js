const config = {
  appId: "com.veylora.app",
  appName: "Veylora",
  webDir: "dist",
  bundledWebRuntime: false,

  server: {
    androidScheme: "https"
  },

  android: {
    allowMixedContent: true
  }
};

module.exports = config;