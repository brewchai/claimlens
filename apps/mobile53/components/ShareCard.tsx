import { forwardRef } from "react";
import { View, Text, Image } from "react-native";
import { ratingEmoji, type Rating } from "../lib/utils";

export type ShareCardProps = {
    title: string;
    channel: string;
    thumb: string;
    consensus: { rating: Rating; summary: string };
    claims: { text: string; rating: Rating }[];
    link?: string;
};

const ShareCard = forwardRef<View, ShareCardProps>(({ title, channel, thumb, consensus, claims, link }, ref) => (
    <View ref={ref} style={{
        backgroundColor: '#0b0b0c',
        padding: 20,
        width: 1080,
        height: 1920,
        justifyContent: 'space-between'
    }}>
        <View>
            <Image
                source={{ uri: thumb }}
                style={{ width: '100%', height: 540, borderRadius: 16 }}
                resizeMode="cover"
            />
            <Text style={{ color: "#f5f5f5", fontSize: 40, marginTop: 24 }} numberOfLines={2}>{title}</Text>
            <Text style={{ color: "#9ca3af", fontSize: 32 }}>{channel}</Text>
            <View style={{ marginTop: 24, padding: 20, borderRadius: 24, backgroundColor: "#0f1115" }}>
                <Text style={{ color: "#f5f5f5", fontSize: 36, fontWeight: "700" }}>
                    Consensus: {consensus.rating.toUpperCase()}
                </Text>
                <Text style={{ color: "#f5f5f5", fontSize: 30 }}>{consensus.summary}</Text>
            </View>
            <View style={{ marginTop: 20, gap: 16 }}>
                {claims.slice(0, 3).map((c, i) => (
                    <Text key={i} style={{ color: "#f5f5f5", fontSize: 34 }}>
                        {ratingEmoji(c.rating)}  {c.text}
                    </Text>
                ))}
            </View>
        </View>
        {link ? <Text style={{ color: "#06b6d4", fontSize: 28, marginTop: 24 }}>{link}</Text> : null}
    </View>
));
export default ShareCard;