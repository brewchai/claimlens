import { Text, View, Pressable } from "react-native";
import { ratingToColor, type Rating } from "../lib/utils";

export default function Badge({
    rating,
    label,
    onPress
}: {
    rating: Rating;
    label?: string;
    onPress?: () => void;
}) {
    const displayText = label || (rating === 'unverified' ? 'UNVERIFIED' : rating.toUpperCase());

    return (
        <Pressable
            onPress={onPress}
            className={`px-2 py-1 rounded-full ${ratingToColor(rating)}`}
        >
            <Text className="text-white text-xs font-semibold">
                {displayText}
            </Text>
        </Pressable>
    );
}