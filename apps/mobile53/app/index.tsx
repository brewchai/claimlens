import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { UrlInput } from './components/UrlInput';
import { VideoPreview } from './components/VideoPreview';

// Helper function to check if URL is a YouTube Short
const isShortUrl = (url: string): boolean => {
    return url.includes('youtube.com/shorts/') || url.includes('youtu.be/');
};

export default function Index() {
    const [url, setUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const isValidUrl = (url: string): boolean => {
        if (!url) return false;
        try {
            new URL(url);
            return url.includes('youtube.com') || url.includes('youtu.be');
        } catch {
            return false;
        }
    };

    const analyzeNow = useCallback(async () => {
        if (!url || !isValidUrl(url)) return;

        try {
            setIsLoading(true);
            setError(null);

            // Add haptic feedback
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // In a real app, you might fetch video metadata here
            // For now, we'll just navigate to results after a short delay
            await new Promise(resolve => setTimeout(resolve, 800));

            router.push({ pathname: "/results", params: { url } });
        } catch (err) {
            console.error('Error analyzing video:', err);
            setError('Could not analyze video. Please try again.');
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setIsLoading(false);
        }
    }, [url]);

    const clearUrl = useCallback(() => {
        setUrl('');
        setError(null);
    }, []);

    const canAnalyze = isValidUrl(url) && !isLoading;
    const showPreview = isValidUrl(url);

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
        >
            <View style={styles.header}>
                <Text style={styles.title}>ClaimLens</Text>
                <Text style={styles.subtitle}>
                    We'll analyze the video's intent, detect claims, and advise you on their trustworthiness.
                </Text>
            </View>

            <View style={styles.card}>
                <UrlInput
                    value={url}
                    onChangeText={setUrl}
                    onSubmit={analyzeNow}
                    onClear={clearUrl}
                    isLoading={isLoading}
                    error={error}
                />

                {showPreview && (
                    <VideoPreview
                        title="Video Title"
                        channel="Channel Name"
                        isShort={isShortUrl(url)}
                    />
                )}

                <View style={styles.buttonContainer}>
                    <Pressable
                        onPress={analyzeNow}
                        disabled={!canAnalyze}
                        style={({ pressed }) => [
                            styles.analyzeButton,
                            !canAnalyze && styles.analyzeButtonDisabled,
                            pressed && styles.analyzeButtonPressed,
                        ]}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canAnalyze }}
                    >
                        {isLoading ? (
                            <ActivityIndicator color="#0C0C0E" size="small" />
                        ) : (
                            <Text style={styles.analyzeButtonText}>
                                {isLoading ? 'Analyzing...' : 'Analyze Video'}
                            </Text>
                        )}
                    </Pressable>

                    <Pressable
                        onPress={clearUrl}
                        style={({ pressed }) => [
                            styles.clearButton,
                            pressed && styles.clearButtonPressed,
                        ]}
                        disabled={!url}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !url }}
                    >
                        <Text style={[
                            styles.clearButtonText,
                            !url && styles.clearButtonTextDisabled
                        ]}>
                            Clear
                        </Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0C0E',
    },
    contentContainer: {
        paddingHorizontal: 20,
        paddingTop: 48,
        paddingBottom: 32,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        color: 'rgba(255, 255, 255, 0.92)',
        fontSize: 30,
        fontWeight: '700',
        letterSpacing: 0.2,
        marginBottom: 8,
    },
    subtitle: {
        color: 'rgba(235, 235, 245, 0.6)',
        fontSize: 16,
        lineHeight: 22,
    },
    card: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 18,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    buttonContainer: {
        marginTop: 16,
        alignItems: 'center',
    },
    analyzeButton: {
        width: '100%',
        height: 52,
        borderRadius: 14,
        backgroundColor: '#11A7C8',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#11A7C8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    analyzeButtonDisabled: {
        backgroundColor: 'rgba(17, 167, 200, 0.5)',
        shadowOpacity: 0,
    },
    analyzeButtonPressed: {
        backgroundColor: '#0E92AE',
        transform: [{ scale: 0.98 }],
    },
    analyzeButtonText: {
        color: '#0C0C0E',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    clearButton: {
        marginTop: 16,
        padding: 12,
    },
    clearButtonPressed: {
        opacity: 0.7,
    },
    clearButtonText: {
        color: '#11A7C8',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
    },
    clearButtonTextDisabled: {
        color: 'rgba(235, 235, 245, 0.3)',
    },
    helperText: {
        color: 'rgba(235, 235, 245, 0.6)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 12,
        paddingHorizontal: 20,
    },
});
