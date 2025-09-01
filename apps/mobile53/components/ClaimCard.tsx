import { View, Text } from "react-native";
import Badge from "./Badge";
import SourceLink from "./SourceLink";
import { type Rating } from "../lib/utils";

export default function ClaimCard({
    text, rating, rationale, sources, onBadgePress,
}: {
    text: string;
    rating: Rating;
    rationale: string;
    sources: { title: string; url: string }[];
    onBadgePress?: () => void;
}) {
    return (
        <View className="bg-[#0f1115] rounded-2xl p-4 gap-2">
            <View className="flex-row justify-between items-start">
                <Text className="text-[#f5f5f5] text-base flex-1 pr-2">{text}</Text>
                <Badge rating={rating} onPress={onBadgePress} />
            </View>
            <Text className="text-[#9ca3af] text-xs">{rationale}</Text>
            <View className="flex-row gap-3">
                {sources?.map((s, i) => (
                    <SourceLink key={i} title={s.title} url={s.url} />
                ))}
            </View>
        </View>
    );
}