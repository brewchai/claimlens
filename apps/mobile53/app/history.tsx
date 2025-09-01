import { View, Text } from "react-native";

// Hide from tab bar
export const unstable_settings = { href: null };

export default function History() {
    return (
        <View className="flex-1 bg-[#0b0b0c] items-center justify-center">
            <Text className="text-white">History coming soon</Text>
        </View>
    );
}