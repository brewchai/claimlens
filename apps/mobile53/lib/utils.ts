export const isYouTubeUrl = (u: string) => /youtu(?:\.be|be\.com)\//i.test(u);
export const extractVideoId = (url: string) => {
    try {
        const u = new URL(url);
        if (u.hostname === "youtu.be") return u.pathname.slice(1);
        if (u.searchParams.get("v")) return u.searchParams.get("v")!;
        return "";
    } catch { return ""; }
};

export type Rating = "unverified" | "doubtful" | "mixed" | "reliable" | "solid";

export const ratingToColor = (r: Rating) => {
    switch (r) {
        case 'solid': return 'bg-emerald-600';
        case 'reliable': return 'bg-emerald-500';
        case 'mixed': return 'bg-amber-500';
        case 'doubtful': return 'bg-orange-500';
        case 'unverified':
        default:
            return 'bg-gray-500';
    }
};

export const ratingEmoji = (r: Rating) => {
    switch (r) {
        case 'solid': return '🟢';
        case 'reliable': return '🟢';
        case 'mixed': return '🟠';
        case 'doubtful': return '🟠';
        case 'unverified':
        default:
            return '⚪';
    }
};