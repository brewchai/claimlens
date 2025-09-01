import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

type VideoPreviewProps = {
    title: string;
    channel: string;
    thumbnailUrl?: string;
    isShort?: boolean;
};

export const VideoPreview = ({
    title = 'Video Title',
    channel = 'Channel Name',
    thumbnailUrl,
    isShort = false,
}: VideoPreviewProps) => {
    return (
        <View style={styles.container}>
            <View style={styles.thumbnailContainer}>
                {thumbnailUrl ? (
                    <Image
                        source={{ uri: thumbnailUrl }}
                        style={styles.thumbnail}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
                        <MaterialIcons name="play-circle-outline" size={24} color="rgba(255, 255, 255, 0.4)" />
                    </View>
                )}
            </View>

            <View style={styles.details}>
                <Text style={styles.title} numberOfLines={2}>
                    {title}
                </Text>
                <View style={styles.metaContainer}>
                    <Text style={styles.channel} numberOfLines={1}>
                        {channel}
                    </Text>
                    {isShort && (
                        <View style={styles.badge}>
                            <MaterialIcons name="bolt" size={12} color="#000" />
                            <Text style={styles.badgeText}>SHORTS</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 8,
    },
    thumbnailContainer: {
        width: 120,
        aspectRatio: 16 / 9,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
    },
    thumbnail: {
        width: '100%',
        height: '100%',
    },
    thumbnailPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
    },
    details: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    title: {
        color: 'rgba(255, 255, 255, 0.92)',
        fontSize: 14,
        lineHeight: 18,
        marginBottom: 6,
        fontWeight: '500',
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    channel: {
        color: 'rgba(235, 235, 245, 0.6)',
        fontSize: 12,
        flex: 1,
        marginRight: 8,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    badgeText: {
        color: '#000',
        fontSize: 10,
        fontWeight: '700',
        marginLeft: 2,
        letterSpacing: 0.5,
    },
});
