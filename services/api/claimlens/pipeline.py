# services/api/claimlens/pipeline.py
import asyncio, hashlib, json, time
from .models import AnalyzeRequest, AnalyzeResponse, Video, Claim, Consensus
from .deps import get_settings
from .youtube import extract_video_id, video_meta, transcript_text
from .openai_client import chat, OpenAIError
from .prompts import CLAIM_EXTRACT_SYSTEM, VERIFY_SYSTEM, CONSENSUS_SYSTEM
import logging
from .search import bing_snippets, factcheck_claims  # keep as-is; it can return []
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

def _json(obj) -> str:
    return json.dumps(obj, ensure_ascii=False)

import json
import logging

logger = logging.getLogger(__name__)

async def extract_claims(transcript: str, max_claims: int) -> tuple[list[str], str | None]:
    # Keep braces out of f-strings; build with plain strings
    user = (
        transcript[:12000]
        + "\n\nReturn JSON: "
        + _json({"claims": [{"text": "..."}]})
    )
    txt = await chat(CLAIM_EXTRACT_SYSTEM, user)
    try:
        data = json.loads(txt)

        # Log summary if present
        summary = data.get("summary")
        if summary:
            logger.info("Video summary: %s", summary)

        claims = []
        for c in data.get("claims", []):
            # Always include text for return
            claims.append(c.get("text", ""))

            # Log extra fields if present
            extras = {k: v for k, v in c.items() if k != "text"}
            if extras:
                logger.info("Extra claim fields: %s", extras)

        return claims[:max_claims], summary
    except Exception as e:
        logger.warning("Failed to parse claims JSON: %s", e)
        return [], None

async def verify_one(claim: str) -> dict:
    s = get_settings()
    snippets = []
    if s.SEARCH_ENABLED:
        bq = await bing_snippets(claim, 3)
        fq = await factcheck_claims(claim, 2)
        snippets = (bq or []) + (fq or [])

    snippet_block = "\n".join(
        f"{i+1}) {snip.get('snippet','')} ({snip.get('url','')})"
        for i, snip in enumerate(snippets)
    ) or "No web snippets available."

    user = (
        'Claim: "' + claim + '"\n'
        "Snippets:\n" + snippet_block + "\n"
        "Return JSON: "
        + _json({
            "rating": "high|medium|low",
            "rationale": "...",
            "sources": [{"title": "...", "url": "..."}],
        })
    )
    txt = await chat(VERIFY_SYSTEM, user)
    try:
        data = json.loads(txt) or {}
    except Exception:
        data = {}

    # normalize
    rating = (data.get("rating") or "medium").lower()
    if rating not in ("high", "medium", "low"):
        rating = "medium"
    rationale = data.get("rationale") or ("Limited evidence; conservative rating." if not snippets else "")
    sources = (data.get("sources") or [])[:2]
    return {"rating": rating, "rationale": rationale, "sources": sources}

async def consensus_from(verified: list[dict]) -> dict:
    compact = [{"rating": v.get("rating"), "rationale": v.get("rationale", "")} for v in verified]
    user = "Claims: " + _json(compact) + "\nReturn JSON: " + _json({"rating":"high|medium|low","summary":"..."})
    txt = await chat(CONSENSUS_SYSTEM, user)
    try:
        data = json.loads(txt)
        rating = (data.get("rating") or "medium").lower()
        if rating not in ("high", "medium", "low"):
            rating = "medium"
        summary = data.get("summary") or "Mixed evidence or uncertainty."
        return {"rating": rating, "summary": summary}
    except Exception:
        return {"rating": "medium", "summary": "Mixed evidence or uncertainty."}

async def run_pipeline(req: AnalyzeRequest) -> AnalyzeResponse:
    s = get_settings()
    t0 = time.time()

    vid = extract_video_id(str(req.url))
    if not vid:
        raise ValueError("Invalid YouTube URL")

    meta = await video_meta(vid)
    tr = await transcript_text(vid)
    if not tr:
        # Clear 400 with actionable message
        raise ValueError("Transcript unavailable; Whisper fallback not yet configured")

    claims_text, video_summary = await extract_claims(tr, min(req.maxClaims, s.MAX_CLAIMS))
    # verify in parallel (cap 3)
    sem = asyncio.Semaphore(3)

    async def _verify(c: str):
        async with sem:
            v = await verify_one(c)
            return {
                "id": hashlib.sha256(c.encode()).hexdigest(),
                "text": c,
                "rating": v["rating"],
                "rationale": v.get("rationale", "")[:180],
                "sources": v.get("sources", []),
            }

    verified = await asyncio.gather(*[_verify(c) for c in claims_text])
    cons = await consensus_from(verified)

    return AnalyzeResponse(
        video=Video(**meta),
        consensus=Consensus(**cons),
        claims=[Claim(**v) for v in verified],
        meta={
            "tookMs": int((time.time() - t0) * 1000),
            "model": s.MODEL_PRIMARY,
            "cached": False,
        },
        videoSummary=video_summary or "",
    )
