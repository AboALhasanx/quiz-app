const { expo } = require("./app.json");

module.exports = () => ({
  ...expo,
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#0B1C2E",
        resizeMode: "contain",
        image: "./assets/images/splash-icon.png",
      },
    ],
    "expo-font",
    "expo-image",
    "expo-web-browser",
    "expo-asset",
  ],
  android: {
    ...expo.android,
    versionCode: 1,
    adaptiveIcon: {
      ...expo.android?.adaptiveIcon,
      foregroundImage: "./assets/images/adaptive-icon.png",
      backgroundColor: "#EDDEC7",
    },
  },
  extra: {
    ...expo.extra,
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY ?? "",
      authDomain: process.env.FIREBASE_AUTH_DOMAIN ?? "",
      projectId: process.env.FIREBASE_PROJECT_ID ?? "",
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? "",
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID ?? "",
      appId: process.env.FIREBASE_APP_ID ?? "",
    },
  },
});
