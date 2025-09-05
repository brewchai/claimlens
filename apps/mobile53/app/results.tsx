import React, { useEffect, useState, useMemo } from "react";
import { ActivityIndicator, ScrollView, Text, View, Linking, Alert, TouchableOpacity } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Constants from "expo-constants";

// ✅ NEW: Hide from tab bar
export const unstable_settings = { href: null };

// ✅ NEW: Import SafeAreaView
import { SafeAreaView } from "react-native-safe-area-context";

type Source = { title: string; url: string };
type Claim = {
    id: string;
    text: string;
    rating: "unverified" | "doubtful" | "mixed" | "reliable" | "solid";
    rationale: string;
    sources: Source[]
};

type Report = {
    video: { id: string; title: string; channel: string; thumbnail: string; durationSec: number };
    consensus: { rating: "unverified" | "doubtful" | "mixed" | "reliable" | "solid"; summary: string };
    claims: Claim[];
    meta: { tookMs: number; model: string; cached: boolean };
    videoSummary: string;
    reportId?: string;
};

const API_BASE =
    (Constants.expoConfig?.extra as any)?.API_URL ||
    (Constants.expoConfig?.extra as any)?.API_BASE ||
    "http://localhost:8000";

export default function Results() {
    const { url: urlParam, reportData, reportId, fromSaved } = useLocalSearchParams<{
        url?: string;
        reportData?: string;
        reportId?: string;
        fromSaved?: string;
    }>();

    const [report, setReport] = useState<Report | null>(null);
    const [loading, setLoading] = useState<boolean>(false);

    const [err, setErr] = useState<string | null>(null);
    const router = useRouter();

    // UI-only state
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [showFullSummary, setShowFullSummary] = useState(false);

    useEffect(() => {
        // Priority 1: If we have reportId, fetch that specific report
        if (reportId) {
            (async () => {
                try {
                    setLoading(true);
                    const res = await fetch(`${API_BASE}/saved-reports/${reportId}`);
                    if (!res.ok) {
                        const detail = await res.text().catch(() => "");
                        throw new Error(`HTTP ${res.status} ${detail}`);
                    }
                    const json = await res.json();
                    setReport(json);
                } catch (e: any) {
                    setErr(e.message || "Failed to load saved report");
                } finally {
                    setLoading(false);
                }
            })();
            return;
        }

        // Priority 2: If we have reportData from navigation params, use it
        if (reportData) {
            try {
                const parsedReport = JSON.parse(reportData);
                setReport(parsedReport);
                return;
            } catch (e) {
                console.error('Error parsing report data:', e);
                setErr('Failed to parse analysis results');
                return;
            }
        }

        // Priority 3: Fallback: make API call if no reportData (for backward compatibility)
        if (report || !urlParam) return;
        let ab = new AbortController();

        (async () => {
            try {
                setLoading(true);
                const res = await fetch(`${API_BASE}/analyze`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url: urlParam, locale: "en", maxClaims: 8 }),
                    signal: ab.signal,
                });
                if (!res.ok) {
                    const detail = await res.text().catch(() => "");
                    throw new Error(`HTTP ${res.status} ${detail}`);
                }
                const json = await res.json();
                setReport(json);
            } catch (e: any) {
                setErr(e.message || "Failed to analyze video");
            } finally {
                setLoading(false);
            }
        })();

        return () => ab.abort();
    }, [urlParam, reportData, reportId]);

    const colorFor = (rating: string) => {
        switch (rating) {
            case 'solid': return '#10b981'; // emerald-500
            case 'reliable': return '#10b981'; // emerald-500
            case 'mixed': return '#f59e0b'; // amber-500
            case 'doubtful': return '#f97316'; // orange-500
            case 'unverified':
            default:
                return '#9ca3af'; // gray-400
        }
    };

    const Pill = ({ text, color }: { text: string; color: string }) => (
        <View style={{
            borderColor: color,
            borderWidth: 1,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 999,
            alignSelf: 'flex-start',
            backgroundColor: '#111216'
        }}>
            <Text style={{ color, fontSize: 12, fontWeight: '700', letterSpacing: 0.6 }}>{text}</Text>
        </View>
    );

    const renderConsensus = () => {
        if (!report) return null;
        const c = report.consensus;
        const col = colorFor(c?.rating || 'unverified');
        return (
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ color: col, opacity: 0.9, fontSize: 12, letterSpacing: 2, fontWeight: '700' }}>CONSENSUS</Text>
                <Text style={{ color: col, fontSize: 40, fontWeight: '800', marginTop: 6 }}>{String(c?.rating || '').toUpperCase()}</Text>
                {c?.summary ? (
                    <Text style={{ color: '#9ca3af', textAlign: 'center', marginTop: 8, lineHeight: 20 }}>{c.summary}</Text>
                ) : null}
            </View>
        );
    };

    const renderSummaryCard = () => {
        if (!report?.videoSummary) return null;
        const collapsedLines = 4;
        const isCollapsed = !showFullSummary;
        return (
            <View style={{ backgroundColor: '#141416', padding: 14, borderRadius: 14, marginBottom: 16 }}>
                <Text style={{ color: '#ffffff', fontWeight: '600', marginBottom: 8 }}>Video Summary</Text>
                <Text
                    style={{ color: '#b0b3b8', lineHeight: 20 }}
                    numberOfLines={isCollapsed ? collapsedLines : undefined}
                >
                    {report.videoSummary}
                </Text>
                <TouchableOpacity onPress={() => setShowFullSummary(!showFullSummary)} style={{ marginTop: 8 }}>
                    <Text style={{ color: '#9ca3af' }}>{isCollapsed ? 'See more ›' : 'See less ›'}</Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderClaim = (claim: Claim) => {
        const col = colorFor(claim.rating);
        const isOpen = !!expanded[claim.id];
        return (
            <TouchableOpacity
                key={claim.id}
                activeOpacity={0.9}
                onPress={() => setExpanded((p) => ({ ...p, [claim.id]: !p[claim.id] }))}
                style={{ backgroundColor: '#121214', padding: 14, borderRadius: 14, marginBottom: 12 }}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={{ color: '#e5e7eb', flex: 1, marginRight: 12 }}>{claim.text}</Text>
                    <Pill text={claim.rating.toUpperCase()} color={col} />
                </View>
                {isOpen ? (
                    <View style={{ marginTop: 10 }}>
                        {claim.rationale ? (
                            <Text style={{ color: '#9ca3af', fontSize: 13, lineHeight: 19 }}>{claim.rationale}</Text>
                        ) : null}
                        {claim.sources?.length ? (
                            <View style={{ marginTop: 8, gap: 6 }}>
                                {claim.sources.map((s, i) => (
                                    <Text
                                        key={i}
                                        style={{ color: '#60a5fa', fontSize: 13 }}
                                        onPress={() => Linking.openURL(s.url).catch((e) => Alert.alert("Cannot open link", e.message))}
                                    >
                                        {(s.title || 'Source')} • {s.url}
                                    </Text>
                                ))}
                            </View>
                        ) : null}
                    </View>
                ) : null}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            // ✅ WRAPPED IN SafeAreaView
            <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0b0c" }} edges={["top", "left", "right"]}>
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <ActivityIndicator />
                    <Text style={{ color: "#9ca3af", marginTop: 12 }}>Analyzing…</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (err) {
        return (
            // ✅ WRAPPED IN SafeAreaView
            <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0b0c" }} edges={["top", "left", "right"]}>
                <View style={{ flex: 1, padding: 20, gap: 12, justifyContent: "center" }}>
                    <Text style={{ color: "#ef4444", fontWeight: "600" }}>Error</Text>
                    <Text style={{ color: "#9ca3af" }}>{err}</Text>
                    <Text style={{ color: "#60a5fa" }} onPress={() => router.back()}>
                        ← Go back
                    </Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!report) {
        return (
            // ✅ WRAPPED IN SafeAreaView
            <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0b0c" }} edges={["top", "left", "right"]}>
                <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: "#9ca3af" }}>No data.</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        // ✅ WRAPPED IN SafeAreaView
        <SafeAreaView style={{ flex: 1, backgroundColor: "#0b0b0c" }} edges={["top", "left", "right"]}>
            <ScrollView
                contentContainerStyle={{ padding: 16 }}
                contentInsetAdjustmentBehavior="automatic" // ✅ ensures proper inset on iOS
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        marginBottom: 12,
                        backgroundColor: "#1f2937",
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 6,
                        alignSelf: "flex-start",
                    }}
                >
                    <Text style={{ color: "#60a5fa", fontSize: 14 }}>
                        ← {fromSaved === 'true' ? 'Back to Saved Reports' : 'Back'}
                    </Text>
                </TouchableOpacity>

                {/* Title + channel */}
                <Text style={{ color: "#fff", fontSize: 20, marginBottom: 2, fontWeight: '700' }}>{report.video?.title}</Text>
                <Text style={{ color: "#9ca3af", marginBottom: 16 }}>{report.video?.channel}</Text>

                {/* Consensus focal */}
                {renderConsensus()}

                {/* Video summary card */}
                {renderSummaryCard()}

                {/* Claims list (collapsible cards) */}
                {(report.claims as Claim[] | undefined)?.map((c) => renderClaim(c))}
            </ScrollView>
        </SafeAreaView>
    );
}
