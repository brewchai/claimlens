import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// Width of the swipe-to-delete action area
const ACTION_WIDTH = 88;

// Hide from tab bar / routing
export const unstable_settings = { href: null };

type SavedReport = {
    id: string;
    video: {
        id: string;
        title: string;
        channel: string;
        thumbnail: string;
        durationSec: number;
    };
    consensus: {
        rating: "unverified" | "doubtful" | "mixed" | "reliable" | "solid";
        summary: string;
    };
    created_at: string;
};

type SavedReportsResponse = {
    reports: SavedReport[];
    total: number;
    has_more: boolean;
};

const API_BASE =
    (Constants.expoConfig?.extra as any)?.API_URL ||
    (Constants.expoConfig?.extra as any)?.API_BASE ||
    "http://localhost:8000";

export default function SavedScreen() {
    const [reports, setReports] = useState<SavedReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [total, setTotal] = useState(0);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const router = useRouter();

    const loadReports = useCallback(async (offset: number = 0, limit: number = 5, append: boolean = false) => {
        try {
            if (!append) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError(null);

            const response = await fetch(`${API_BASE}/saved-reports?limit=${limit}&offset=${offset}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            const data: SavedReportsResponse = await response.json();

            if (append) {
                setReports(prev => {
                    const combined = [...prev, ...data.reports];
                    const uniqueMap = new Map<string, SavedReport>();
                    for (const r of combined) uniqueMap.set(r.id, r);
                    return Array.from(uniqueMap.values());
                });
            } else {
                // Replace with unique set in case backend returns duplicates
                const uniqueMap = new Map<string, SavedReport>();
                for (const r of data.reports) uniqueMap.set(r.id, r);
                setReports(Array.from(uniqueMap.values()));
            }

            setHasMore(data.has_more);
            setTotal(data.total);
        } catch (err: any) {
            console.error('Error loading saved reports:', err);
            setError(err.message || 'Failed to load saved reports');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, []);

    useEffect(() => {
        loadReports(0, 5);
    }, [loadReports]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadReports(0, 5);
        } finally {
            setRefreshing(false);
        }
    }, [loadReports]);

    const loadMore = useCallback(() => {
        if (!loadingMore && hasMore) {
            loadReports(reports.length, 5, true);
        }
    }, [loadingMore, hasMore, reports.length, loadReports]);

    const deleteReportById = useCallback(async (reportId: string) => {
        const resp = await fetch(`${API_BASE}/saved-reports/${reportId}`, { method: 'DELETE' });
        if (!resp.ok) {
            const text = await resp.text();
            throw new Error(`HTTP ${resp.status}: ${text || 'Failed to delete'}`);
        }
    }, []);

    const handleConfirmDelete = useCallback(async (reportId: string) => {
        // Capture current state before any updates to avoid race conditions
        const currentReportsLength = reports.length;

        // Optimistic update: remove locally and decrement total
        setDeletingId(reportId);
        setReports(prev => prev.filter(r => r.id !== reportId));
        setTotal(prev => Math.max(0, prev - 1));

        try {
            await deleteReportById(reportId);
            // Backfill one item to keep page size if possible
            if (hasMore) {
                await loadReports(currentReportsLength - 1, 1, true);
            } else {
                // If we may have crossed the boundary, refresh hasMore/total by refetching small page when list empty
                if (currentReportsLength === 1) {
                    await loadReports(0, 5);
                }
            }
        } catch (err: any) {
            console.error('Delete failed:', err);
            // Rollback: re-fetch current page to restore consistency
            await loadReports(0, Math.max(currentReportsLength, 5));
            Alert.alert('Delete failed', err?.message || 'Unable to delete the report.');
        } finally {
            setDeletingId(null);
        }
    }, [deleteReportById, hasMore, loadReports, reports.length]);

    const handleDeletePress = useCallback((report: SavedReport) => {
        Alert.alert(
            'Delete report',
            'Are you sure you want to delete this saved report? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => handleConfirmDelete(report.id) },
            ]
        );
    }, [handleConfirmDelete]);

    const handleReportPress = useCallback((report: SavedReport) => {
        // Navigate to results screen with the report ID
        router.push({
            pathname: '/results',
            params: {
                reportId: report.id,
                fromSaved: 'true'
            }
        });
    }, [router]);

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

    const formatDate = (dateString: string) => {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Unknown date';
        }
    };

    function SwipeRow({
        children,
        onDelete,
        disabled,
    }: {
        children: React.ReactNode;
        onDelete: () => void;
        disabled: boolean;
    }) {
        const translateX = useSharedValue(0);
        const startX = useSharedValue(0);

        const pan = Gesture.Pan()
            .onStart(() => {
                startX.value = translateX.value;
            })
            .onUpdate((e) => {
                // clamp between -ACTION_WIDTH and 0
                const next = startX.value + e.translationX;
                translateX.value = Math.min(0, Math.max(-ACTION_WIDTH, next));
            })
            .onEnd(() => {
                const shouldOpen = Math.abs(translateX.value) > ACTION_WIDTH * 0.6;
                translateX.value = withTiming(shouldOpen ? -ACTION_WIDTH : 0, { duration: 160 });
            });

        const cardStyle = useAnimatedStyle(() => ({
            transform: [{ translateX: translateX.value }],
        }));

        return (
            <View style={{ position: 'relative' }}>
                <View style={styles.rightActionWrapper} pointerEvents="box-none">
                    <TouchableOpacity
                        onPress={disabled ? undefined : onDelete}
                        disabled={disabled}
                        style={styles.rightAction}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.rightActionText, disabled && { opacity: 0.7 }]}>
                            {disabled ? 'Deleting…' : 'Delete'}
                        </Text>
                    </TouchableOpacity>
                </View>
                <GestureDetector gesture={pan}>
                    <Animated.View style={cardStyle}>
                        {children}
                    </Animated.View>
                </GestureDetector>
            </View>
        );
    }

    const renderReportCard = (report: SavedReport) => {
        const consensusColor = colorFor(report.consensus.rating);

        return (
            <SwipeRow key={report.id} onDelete={() => handleDeletePress(report)} disabled={deletingId === report.id}>
                <TouchableOpacity
                    style={styles.reportCard}
                    onPress={() => handleReportPress(report)}
                    activeOpacity={0.7}
                >
                    <View style={styles.cardHeader}>
                        <Text style={styles.videoTitle} numberOfLines={2}>
                            {report.video.title}
                        </Text>
                        <View style={[styles.ratingPill, { borderColor: consensusColor }]}>
                            <Text style={[styles.ratingText, { color: consensusColor }]}>
                                {report.consensus.rating.toUpperCase()}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.channelName} numberOfLines={1}>
                        {report.video.channel}
                    </Text>

                    <Text style={styles.consensusSummary} numberOfLines={2}>
                        {report.consensus.summary}
                    </Text>

                    <Text style={styles.dateText}>
                        {formatDate(report.created_at)}
                    </Text>
                </TouchableOpacity>
            </SwipeRow>
        );
    };

    const renderLoadMoreSection = () => {
        if (!hasMore) return null;

        return (
            <View style={styles.loadMoreSection}>
                <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMore}
                    disabled={loadingMore}
                    activeOpacity={0.7}
                >
                    <Text style={styles.loadMoreButtonText}>
                        {loadingMore ? 'Loading…' : 'Load more'}
                    </Text>
                </TouchableOpacity>

                {loadingMore && (
                    <View style={styles.loadingMore}>
                        <ActivityIndicator color="#11A7C8" size="small" />
                        <Text style={styles.loadingMoreText}>Loading more reports...</Text>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color="#11A7C8" />
                        <Text style={styles.loadingText}>Loading saved reports...</Text>
                    </View>
                </SafeAreaView>
            </GestureHandlerRootView>
        );
    }

    if (error) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                    <View style={styles.centerContent}>
                        <Text style={styles.errorTitle}>Error</Text>
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => loadReports(0, 5)}
                        >
                            <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </GestureHandlerRootView>
        );
    }

    if (reports.length === 0) {
        return (
            <GestureHandlerRootView style={{ flex: 1 }}>
                <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                    <View style={styles.centerContent}>
                        <Text style={styles.emptyTitle}>No Saved Reports</Text>
                        <Text style={styles.emptyText}>
                            Your saved reports will appear here after you analyze videos
                        </Text>
                    </View>
                </SafeAreaView>
            </GestureHandlerRootView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    contentInsetAdjustmentBehavior="automatic"
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#11A7C8"
                        />
                    }
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>Saved Reports</Text>
                        <Text style={styles.subtitle}>
                            {total} report{total !== 1 ? 's' : ''} saved
                        </Text>
                    </View>

                    <View style={styles.reportsList}>
                        {reports.map(renderReportCard)}
                    </View>

                    {renderLoadMoreSection()}
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0b0b0c',
    },
    scrollContent: {
        padding: 16,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    header: {
        marginBottom: 24,
    },
    title: {
        color: '#ffffff',
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 4,
    },
    subtitle: {
        color: '#9ca3af',
        fontSize: 16,
    },
    reportsList: {
        gap: 12,
    },
    reportCard: {
        backgroundColor: '#141416',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    videoTitle: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 12,
        lineHeight: 22,
    },
    ratingPill: {
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        backgroundColor: '#111216',
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    channelName: {
        color: '#9ca3af',
        fontSize: 14,
        marginBottom: 8,
    },
    consensusSummary: {
        color: '#b0b3b8',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    dateText: {
        color: '#6b7280',
        fontSize: 12,
    },
    loadMoreSection: {
        marginTop: 24,
        alignItems: 'center',
    },
    loadMoreButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    loadMoreButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '600',
    },
    loadingMore: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        gap: 8,
    },
    loadingMoreText: {
        color: '#9ca3af',
        fontSize: 14,
    },
    loadingText: {
        color: '#9ca3af',
        fontSize: 16,
        marginTop: 12,
    },
    errorTitle: {
        color: '#ef4444',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    errorText: {
        color: '#9ca3af',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
    },
    retryButton: {
        backgroundColor: '#11A7C8',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#0C0C0E',
        fontSize: 14,
        fontWeight: '600',
    },
    emptyTitle: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptyText: {
        color: '#9ca3af',
        fontSize: 14,
        textAlign: 'center',
    },
    rightActionWrapper: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: ACTION_WIDTH,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rightAction: {
        width: ACTION_WIDTH,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#7f1d1d', // dark red
        borderTopRightRadius: 14,
        borderBottomRightRadius: 14,
    },
    rightActionText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
});
