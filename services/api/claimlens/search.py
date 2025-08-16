import httpx, os
from typing import List, Dict

BING = os.getenv("BING_API_KEY", "")
GFC = os.getenv("GOOGLE_FACTCHECK_API_KEY", "")

async def bing_snippets(query: str, n: int = 3) -> List[Dict]:
    if not BING:
        return []
    headers = {"Ocp-Apim-Subscription-Key": BING}
    async with httpx.AsyncClient(timeout=15) as cx:
        r = await cx.get("https://api.bing.microsoft.com/v7.0/search", params={"q": query, "count": n}, headers=headers)
        r.raise_for_status()
        web = r.json().get("webPages", {}).get("value", [])
        return [{"title": w.get("name"), "snippet": w.get("snippet"), "url": w.get("url")} for w in web]

async def factcheck_claims(query: str, n: int = 2) -> List[Dict]:
    if not GFC:
        return []
    async with httpx.AsyncClient(timeout=15) as cx:
        r = await cx.get("https://factchecktools.googleapis.com/v1alpha1/claims:search", params={"query": query, "key": GFC, "pageSize": n})
        r.raise_for_status()
        items = r.json().get("claims", [])
        out = []
        for it in items:
            url = (it.get("claimReview") or [{}])[0].get("url")
            out.append({"title": it.get("text", "Fact check"), "snippet": it.get("text", ""), "url": url})
        return out