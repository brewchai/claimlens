# claimlens/services/api/claimlens/youtube.py
import re
from typing import Optional, List
import httpx
import asyncio

YTI = re.compile(r"(?:v=|/)([A-Za-z0-9_-]{11})(?:[^A-Za-z0-9_-]|$)")

def extract_video_id(url: str) -> Optional[str]:
    m = YTI.search(url or "")
    return m.group(1) if m else None

async def video_meta(video_id: str) -> dict:
    """
    Lightweight metadata via oEmbed (no API key).
    Duration isn't available here; set 0 for MVP.
    """
    oembed = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
    thumb = f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
    async with httpx.AsyncClient(timeout=15) as cx:
        r = await cx.get(oembed)
        r.raise_for_status()
        j = r.json()
        return {
            "id": video_id,
            "title": j.get("title", "YouTube Video"),
            "channel": j.get("author_name", "YouTube"),
            "thumbnail": thumb,
            "durationSec": 0,
        }

def _fetch_transcript_sync(video_id: str, preferred_langs: Optional[List[str]] = None) -> str:
    """
    Synchronous helper using youtube-transcript-api >= 1.2.x.
    Tries preferred languages first, then any available transcript.
    Returns a single plain-text string (no HTML).
    """
    from youtube_transcript_api import YouTubeTranscriptApi  # type: ignore

    preferred_langs = preferred_langs or ["en", "en-US", "en-GB"]

    ytt = YouTubeTranscriptApi()

    # 1) Try a preferred language first
    try:
        fetched = ytt.fetch(video_id, languages=preferred_langs)
        # fetched is a FetchedTranscript (iterable of snippets)
        return " ".join(snippet.text for snippet in fetched if getattr(snippet, "text", ""))
    except Exception:
        pass

    # 2) Otherwise, list transcripts and pick the first available
    try:
        transcript_list = ytt.list(video_id)  # TranscriptList
        # Prefer manually created, else generated, else any
        try:
            tr = transcript_list.find_manually_created_transcript(preferred_langs)
        except Exception:
            try:
                tr = transcript_list.find_generated_transcript(preferred_langs)
            except Exception:
                # fall back to any transcript in the list
                tr = next(iter(transcript_list))
        fetched = tr.fetch()
        return " ".join(snippet.text for snippet in fetched if getattr(snippet, "text", ""))
    except Exception:
        # No transcripts (e.g., Shorts, captions disabled)
        return ""

async def transcript_text(video_id: str) -> str:
    """
    Async wrapper so our FastAPI pipeline doesn’t block the event loop.
    """
    return await asyncio.to_thread(_fetch_transcript_sync, video_id, ["en", "en-US", "en-GB"])
