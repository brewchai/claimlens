# services/api/claimlens/openai_client.py
import httpx, asyncio, json
from .deps import get_settings

class OpenAIError(RuntimeError): ...

async def chat(system: str, user: str, *, model: str | None = None) -> str:
    s = get_settings()
    if not s.OPENAI_API_KEY:
        raise OpenAIError("OPENAI_API_KEY not set")

    payload = {
        "model": model or s.MODEL_PRIMARY,
        "temperature": 0.2,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }

    async with httpx.AsyncClient(timeout=s.HTTP_TIMEOUT_S) as cx:
        # simple retry on 5xx only, one fallback on model
        for attempt in range(2):
            r = await cx.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {s.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            if r.status_code >= 500 and attempt == 0 and payload["model"] != s.MODEL_FALLBACK:
                payload["model"] = s.MODEL_FALLBACK
                await asyncio.sleep(0.5)
                continue

            if r.status_code == 401:
                raise OpenAIError("OpenAI 401 Unauthorized (invalid or missing API key)")
            if r.status_code == 429:
                raise OpenAIError(f"OpenAI 429 Rate limited: {r.text}")
            try:
                r.raise_for_status()
            except httpx.HTTPStatusError as e:
                raise OpenAIError(f"OpenAI {r.status_code}: {r.text}") from e

            data = r.json()
            try:
                return data["choices"][0]["message"]["content"]
            except Exception:
                raise OpenAIError(f"Unexpected OpenAI response: {json.dumps(data)[:400]}")
    # unreachable
