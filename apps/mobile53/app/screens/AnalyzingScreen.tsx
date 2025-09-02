import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

// This makes the screen visible in the navigation
export default function AnalyzingScreen() {
    console.log('🔥 AnalyzingScreen component loaded/rendered');
    const [message, setMessage] = useState('Analyzing...');

    const MESSAGES = [
        "Curiosity is the first step toward truth.",
        "Every claim deserves a question mark.",
        "Asking questions is how discoveries begin.",
        "Fact-checking isn't about doubt… it's about clarity.",
        "The right question is often more powerful than the right answer.",
        "Curiosity turns confusion into discovery.",
        "Checking claims keeps knowledge honest.",
        "Skepticism sharpens understanding.",
        "Curiosity is your superpower in the age of information.",
        "Asking why is how progress begins."
    ];

    useEffect(() => {
        console.log('🚀 AnalyzingScreen mounted and useEffect running');
        const randomIndex = Math.floor(Math.random() * MESSAGES.length);
        const selectedMessage = MESSAGES[randomIndex];
        console.log('📝 Random index:', randomIndex);
        console.log('📝 Selected message:', selectedMessage);
        setMessage(selectedMessage);
        console.log('✅ Message state updated');

        const timeout = setTimeout(() => {
            console.log('Backup message set');
            setMessage(selectedMessage);
        }, 100);

        return () => {
            console.log('💀 AnalyzingScreen unmounting');
            clearTimeout(timeout);
        };
    }, []);

    console.log('🎯 AnalyzingScreen render - current message state:', message);

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                <ActivityIndicator
                    size="large"
                    color="#11A7C8"
                    style={styles.spinner}
                />
                <Text style={styles.message}>{message}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0C0C0E',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    spinner: {
        marginBottom: 32,
    },
    message: {
        color: 'rgba(255, 255, 255, 0.92)',
        fontSize: 16,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 22,
    },
});
