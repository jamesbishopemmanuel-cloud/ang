import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {

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

export default config;