import { Platform } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";

type Extra = { API_URL?: string };
const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

// Fallbacks if API_URL isn't provided in app.config.ts
const EMU_ANDROID = "http://10.0.2.2:8000";   // Android emulator → host machine
const EMU_IOS = "http://localhost:8000";  // iOS simulator → host machine
const LAN_DEFAULT = "http://localhost:8000"; // ← replace with your Mac’s LAN IP

export const API_URL =
    extra.API_URL ??
    (!Device.isDevice && Platform.OS === "android" ? EMU_ANDROID :
        !Device.isDevice && Platform.OS === "ios" ? EMU_IOS :
            LAN_DEFAULT);

// (Optional) quick sanity log — remove later
console.log("Using API_URL:", API_URL);

export type AnalyzeResponse = {
    video: { id: string; title: string; channel: string; thumbnail: string; durationSec: number; };
    consensus: { rating: "unverified" | "doubtful" | "mixed" | "reliable" | "solid"; summary: string };
    claims: Array<{ id: string; text: string; rating: "unverified" | "doubtful" | "mixed" | "reliable" | "solid"; rationale: string; sources: { title: string; url: string }[]; spans?: { startSec: number; endSec: number }[] }>;
    meta: { tookMs: number; model: string; cached: boolean };
    videoSummary: string;
};

export async function analyze(url: string, locale = "en", maxClaims = 8): Promise<AnalyzeResponse> {
    const res = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, locale, maxClaims }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
}
