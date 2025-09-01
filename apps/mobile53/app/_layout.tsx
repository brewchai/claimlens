import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from 'react-query';
import { StatusBar } from 'expo-status-bar';

const qc = new QueryClient();

export default function Layout() {
    return (
        <QueryClientProvider client={qc}>
            <StatusBar style="light" />
            <Tabs
                screenOptions={({ route }) => ({
                    tabBarIcon: ({ color, size }) => {
                        let iconName: 'home' | 'folder' | 'user' = 'home';
                        if (route.name === 'index') iconName = 'home';
                        else if (route.name === 'saved') iconName = 'folder';
                        else if (route.name === 'profile') iconName = 'user';
                        return <Feather name={iconName} size={size} color={color} />;
                    },
                    tabBarActiveTintColor: '#0ea5e9',
                    tabBarInactiveTintColor: '#9ca3af',
                    tabBarStyle: {
                        backgroundColor: '#0b0b0c',
                        borderTopWidth: 0,
                        paddingBottom: 5,
                        paddingTop: 5,
                    },
                    headerShown: false,
                })}
            >
                {/* Visible tabs */}
                <Tabs.Screen name="index" options={{ title: 'Home' }} />
                <Tabs.Screen name="saved" options={{ title: 'Saved' }} />
                <Tabs.Screen name="profile" options={{ title: 'Profile' }} />

                {/* Hide non-tab routes explicitly */}
                <Tabs.Screen name="history" options={{ href: null }} />
                <Tabs.Screen name="results" options={{ href: null }} />
                <Tabs.Screen name="screens/HomeScreen" options={{ href: null }} />
                <Tabs.Screen name="screens/SavedScreen" options={{ href: null }} />
                <Tabs.Screen name="screens/ProfileScreen" options={{ href: null }} />
            </Tabs>
            {/* Mount file-based routes like app/results.tsx */}
        </QueryClientProvider>
    );
}