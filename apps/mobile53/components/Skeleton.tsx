import { View } from "react-native";
export default function Skeleton({ height = 16, className = "" }: { height?: number; className?: string }) {
    return <View className={`rounded-xl bg-zinc-800/60 ${className}`} style={{ height }} />;
}