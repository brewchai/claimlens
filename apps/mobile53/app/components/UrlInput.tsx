import React, { useState, useEffect } from 'react';
import { View, TextInput, Pressable, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

type UrlInputProps = {
    value: string;
    onChangeText: (text: string) => void;
    onSubmit: () => void;
    onClear: () => void;
    isLoading?: boolean;
    error?: string | null;
};

export const UrlInput = ({
    value,
    onChangeText,
    onSubmit,
    onClear,
    isLoading = false,
    error = null,
}: UrlInputProps) => {
    const [hasClipboardUrl, setHasClipboardUrl] = useState(false);
    const [isPasteLoading, setIsPasteLoading] = useState(false);
    const isUrlValid = isValidUrl(value);

    // Check clipboard for URLs when component mounts
    useEffect(() => {
        const checkClipboard = async () => {
            try {
                const text = await Clipboard.getStringAsync();
                setHasClipboardUrl(isValidUrl(text));
            } catch (e) {
                console.warn('Failed to read clipboard');
            }
        };

        checkClipboard();
    }, []);

    const handlePaste = async () => {
        try {
            setIsPasteLoading(true);
            const text = await Clipboard.getStringAsync();
            if (text) {
                onChangeText(text);
            }
        } catch (e) {
            console.warn('Failed to paste from clipboard');
        } finally {
            setIsPasteLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.inputContainer}>
                <MaterialIcons
                    name="link"
                    size={20}
                    color="rgba(255, 255, 255, 0.6)"
                    style={styles.linkIcon}
                />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder="Paste a YouTube link"
                    placeholderTextColor="rgba(255, 255, 255, 0.3)"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="url"
                    returnKeyType="go"
                    onSubmitEditing={onSubmit}
                    editable={!isLoading}
                />
                {isUrlValid && (
                    <View style={styles.validIndicator}>
                        <MaterialIcons name="check-circle" size={20} color="#34C759" />
                        <Text style={styles.validText}>Valid</Text>
                    </View>
                )}
                {hasClipboardUrl && !isPasteLoading && !isUrlValid && (
                    <Pressable
                        style={styles.pasteButton}
                        onPress={handlePaste}
                        disabled={isLoading}
                    >
                        <Text style={styles.pasteText}>Paste</Text>
                    </Pressable>
                )}
                {isPasteLoading && (
                    <ActivityIndicator size="small" color="#11A7C8" style={styles.pasteLoading} />
                )}
            </View>

            {error && (
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={16} color="#FF453A" />
                    <Text style={styles.errorText}>{error}</Text>
                </View>
            )}
        </View>
    );
};

// Basic URL validation - can be enhanced with more specific YouTube URL patterns
const isValidUrl = (url: string): boolean => {
    if (!url) return false;
    try {
        new URL(url);
        return url.includes('youtube.com') || url.includes('youtu.be');
    } catch {
        return false;
    }
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginBottom: 16,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.09)',
        borderRadius: 12,
        height: 48,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    linkIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: 'rgba(255, 255, 255, 0.92)',
        fontSize: 16,
        paddingVertical: 12,
        paddingRight: 8,
    },
    validIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 8,
    },
    validText: {
        color: '#34C759',
        fontSize: 14,
        marginLeft: 4,
        fontWeight: '500',
    },
    pasteButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginLeft: 8,
    },
    pasteText: {
        color: '#11A7C8',
        fontSize: 14,
        fontWeight: '500',
    },
    pasteLoading: {
        marginLeft: 8,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        marginLeft: 4,
    },
    errorText: {
        color: '#FF453A',
        fontSize: 13,
        marginLeft: 4,
    },
});
