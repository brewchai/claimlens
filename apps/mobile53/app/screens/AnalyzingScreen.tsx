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
        "Asking why is how progress begins.",
        "Truth is the foundation of trust in a world of claims.",
        "A fact-checked mind is a shield against deception.",
        "Verification is the bridge between information and knowledge.",
        "In a world of noise, critical thinking is your compass.",
        "The pursuit of truth begins with questioning everything.",
        "Doubt is the birthplace of deeper understanding.",
        "Every fact verified is a step toward a clearer reality.",
        "Wisdom starts with the courage to question.",
        "In the marketplace of ideas, verification is the currency.",
        "The truth may be complex, but it's always worth pursuing."
    ];

    useEffect(() => {
        console.log('🚀 AnalyzingScreen mounted and useEffect running');

        // Initial message
        const randomIndex = Math.floor(Math.random() * MESSAGES.length);
        setMessage(MESSAGES[randomIndex]);

        // Set up interval to change message every 3 seconds
        const interval = setInterval(() => {
            const newRandomIndex = Math.floor(Math.random() * MESSAGES.length);
            setMessage(MESSAGES[newRandomIndex]);
        }, 2500);

        return () => {
            console.log('💀 AnalyzingScreen unmounting');
            clearInterval(interval);
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
