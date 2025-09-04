# services/api/claimlens/deps.py
import os
from functools import lru_cache
from typing import List

def _bool(name: str, default: bool = False) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in ("1", "true", "yes", "on")

def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, "").strip() or default)
    except Exception:
        return default

def _list(name: str, default: List[str]) -> List[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    # comma or space separated
    parts = [p.strip() for p in raw.replace(" ", ",").split(",") if p.strip()]
    return parts or default

class Settings:
    # feature flags
    CLAIMLENS_MOCK: bool
    SEARCH_ENABLED: bool
    CLAIMLENS_DEBUG: bool

    # ai / search
    OPENAI_API_KEY: str
    MODEL_PRIMARY: str
    MODEL_FALLBACK: str
    BING_API_KEY: str | None

    # limits
    MAX_CLAIMS: int
    HTTP_TIMEOUT_S: int

    # CORS
    CORS_ALLOW_ORIGINS: List[str]

    # Supabase
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_TABLE: str = "reports"

    def __init__(self) -> None:
        self.CLAIMLENS_MOCK  = _bool("CLAIMLENS_MOCK", False)
        self.SEARCH_ENABLED  = _bool("SEARCH_ENABLED", False)
        self.CLAIMLENS_DEBUG = _bool("CLAIMLENS_DEBUG", False)

        self.OPENAI_API_KEY  = os.getenv("OPENAI_API_KEY", "")
        self.BING_API_KEY    = os.getenv("BING_API_KEY")
        self.MODEL_PRIMARY   = os.getenv("MODEL_PRIMARY", "gpt-4o")
        self.MODEL_FALLBACK  = os.getenv("MODEL_FALLBACK", "gpt-3.5-turbo")
        
        self.MAX_CLAIMS      = _int("MAX_CLAIMS", 8)
        self.HTTP_TIMEOUT_S  = _int("HTTP_TIMEOUT_S", 30)
        
        self.CORS_ALLOW_ORIGINS = _list("CORS_ALLOW_ORIGINS", ["*"])
        
        # Supabase settings
        self.SUPABASE_URL = os.getenv("SUPABASE_URL", "")
        self.SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
        self.SUPABASE_TABLE = os.getenv("SUPABASE_TABLE", "reports")

@lru_cache
def get_settings() -> Settings:
    # Reads env once, reuses afterwards
    return Settings()
