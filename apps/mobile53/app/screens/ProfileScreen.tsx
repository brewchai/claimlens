import { View, Text, StyleSheet } from 'react-native';

// Hide from tab bar / routing
export const unstable_settings = { href: null };

export default function ProfileScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Profile</Text>
            <Text style={styles.subtext}>User information will be shown here</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0b0b0c',
    },
    text: {
        color: '#ffffff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtext: {
        color: '#9ca3af',
        fontSize: 16,
    },
});
