// app.config.ts
import { ExpoConfig } from "expo/config";

export default (): ExpoConfig => ({
    name: "ClaimLens",
    slug: "claimlens",
    scheme: "claimlens",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: { image: "./assets/splash.png", resizeMode: "contain", backgroundColor: "#ffffff" },
    ios: { supportsTablet: true },
    android: { adaptiveIcon: { foregroundImage: "./assets/adaptive-icon.png", backgroundColor: "#ffffff" } },
    web: { bundler: "metro", favicon: "./assets/favicon.png" },
    plugins: ["expo-router"],
    extra: {
        API_URL: "http://localhost:8000", // Using localhost since the API is running locally
    },
    experiments: {},
});
