import { Linking, Pressable, Text } from "react-native";
export default function SourceLink({ title, url }: { title: string; url: string }) {
    return (
        <Pressable onPress={() => Linking.openURL(url)}>
            <Text className="text-cyan-400 text-xs" numberOfLines={1}>{title}</Text>
        </Pressable>
    );
}