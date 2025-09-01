import { Text, View } from "react-native";
import { ratingToColor, type Rating } from "../lib/utils";

export default function ConsensusBadge({
    rating,
    summary
}: {
    rating: Rating;
    summary: string;
}) {
    const displayText = rating === 'unverified' ? 'UNVERIFIED' : rating.toUpperCase();

    return (
        <View className={`flex-row items-center gap-2 px-3 py-2 rounded-xl ${ratingToColor(rating)}`}>
            <Text className="text-white font-semibold">Consensus: {displayText}</Text>
            <Text className="text-white/90 flex-1" numberOfLines={1}>• {summary}</Text>
        </View>
    );
}