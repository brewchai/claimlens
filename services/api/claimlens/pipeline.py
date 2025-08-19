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
    logger.info(f"🔍 Verifying claim: {claim[:100]}{'...' if len(claim) > 100 else ''}")
    s = get_settings()
    
    # Log search initiation
    snippets = []
    if s.SEARCH_ENABLED:
        logger.info("🔎 Search is ENABLED, fetching snippets...")
        try:
            bq = await bing_snippets(claim, 3)
            logger.info(f"🔍 Bing returned {len(bq or [])} snippets")
            fq = await factcheck_claims(claim, 2)
            logger.info(f"🔍 FactCheck returned {len(fq or [])} snippets")
            snippets = (bq or []) + (fq or [])
            logger.info(f"✅ Total snippets found: {len(snippets)}")
            if snippets:
                logger.debug(f"First snippet preview: {snippets[0].get('snippet', '')[:200]}...")
        except Exception as e:
            logger.error(f"❌ Error fetching snippets: {str(e)}", exc_info=True)
    else:
        logger.warning("⚠️  Search is DISABLED in settings, no snippets will be used")

    # Prepare snippets for the model
    snippet_block = "\n".join(
        f"{i+1}) {snip.get('snippet','')} ({snip.get('url','')})"
        for i, snip in enumerate(snippets)
    ) or "(none)"

    # Build the user prompt
    user_prompt = (
        f'Claim: "{claim}"\n'
        "Snippets:\n" + snippet_block + "\n"
        "Return JSON: "
        + _json({
            "rating": "unverified|doubtful|mixed|reliable|solid",
            "rationale": "...",
            "sources": [{"title": "...", "url": "..."}],
        })
    )
    
    logger.debug("📤 Sending to verification model...")
    logger.debug(f"📝 Prompt: {user_prompt[:300]}..." if len(user_prompt) > 300 else f"📝 Prompt: {user_prompt}")

    try:
        # Get the raw response from the model
        txt = await chat(VERIFY_SYSTEM, user_prompt)
        logger.debug(f"📥 Raw response: {txt}")

        # Parse the response
        try:
            data = json.loads(txt) or {}
            logger.debug(f"✅ Parsed response: {data}")
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse JSON response: {e}\nRaw response: {txt}")
            return {
                "rating": "unverified",
                "rationale": "Error parsing verification response",
                "sources": []
            }

        # Process the rating
        valid_ratings = {"unverified", "doubtful", "mixed", "reliable", "solid"}
        raw_rating = (data.get("rating") or "").strip().lower()
        logger.info(f"🎯 Raw rating from model: '{raw_rating}'")
        
        # Validate and normalize the rating
        if raw_rating in valid_ratings:
            rating = raw_rating
            logger.info(f"✅ Valid rating: {rating}")
        else:
            logger.warning(f"⚠️  Invalid rating '{raw_rating}'. Defaulting to 'unverified'")
            rating = "unverified"

        # Process rationale
        rationale = data.get("rationale") or "No rationale provided"
        if not data.get("rationale"):
            logger.warning("⚠️  No rationale provided in response")

        # Process sources
        sources = data.get("sources", [])
        if not isinstance(sources, list):
            logger.warning(f"⚠️  Sources is not a list: {sources}")
            sources = []
        
        sources = sources[:2]  # Cap at 2 sources
        logger.info(f"📚 Found {len(sources)} sources in response")

        # Log if we have snippets but got unverified
        if rating == "unverified" and snippets:
            logger.warning("⚠️  Claim marked as 'unverified' despite having snippets")
            logger.debug(f"First snippet: {snippets[0].get('snippet', '')[:200]}...")

        result = {
            "rating": rating,
            "rationale": rationale,
            "sources": sources
        }
        
        logger.info(f"✅ Verification complete. Final rating: {rating}")
        return result

    except Exception as e:
        logger.error(f"❌ Error in verify_one: {str(e)}", exc_info=True)
        return {
            "rating": "unverified",
            "rationale": f"Verification error: {str(e)[:100]}",
            "sources": []
        }

async def consensus_from(verified: list[dict]) -> dict:
    compact = [{"rating": v.get("rating"), "rationale": v.get("rationale", "")} for v in verified]
    
    # Update the expected output format in the prompt
    user = "Claims: " + _json(compact) + "\nReturn JSON: " + _json({
        "rating": "unverified|doubtful|mixed|reliable|solid",
        "summary": "..."
    })
    
    txt = await chat(CONSENSUS_SYSTEM, user)
    
    try:
        data = json.loads(txt)
        rating = (data.get("rating") or "unverified").lower()
        
        # Validate the rating is one of our expected values
        valid_ratings = {"unverified", "doubtful", "mixed", "reliable", "solid"}
        if rating not in valid_ratings:
            rating = "unverified"
            
        summary = data.get("summary") or "Insufficient evidence or mixed claims."
        return {"rating": rating, "summary": summary}
        
    except Exception as e:
        logger.warning(f"Failed to parse consensus: {e}")
        return {"rating": "unverified", "summary": "Unable to determine consensus due to an error."}

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
