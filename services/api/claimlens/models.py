from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Literal
from datetime import datetime

Rating = Literal["unverified", "doubtful", "mixed", "reliable", "solid"]

class AnalyzeRequest(BaseModel):
    url: HttpUrl
    locale: str = "en"
    maxClaims: int = 8

class Video(BaseModel):
    id: str; title: str; channel: str; thumbnail: HttpUrl; durationSec: int

class Source(BaseModel):
    title: str; url: HttpUrl

class Span(BaseModel):
    startSec: int; endSec: int

class Claim(BaseModel):
    id: str; text: str; rating: Rating; rationale: str; sources: List[Source]; spans: Optional[List[Span]] = None

class Consensus(BaseModel):
    rating: Rating; summary: str

class AnalyzeResponse(BaseModel):
    video: Video
    consensus: Consensus
    claims: List[Claim]
    reportId: str | None = None  # Will be populated by the backend after saving
    meta: dict
    videoSummary: str

class SavedReportSummary(BaseModel):
    id: str
    video: Video
    consensus: Consensus
    created_at: datetime
    
class SavedReportsRequest(BaseModel):
    limit: int = Field(default=5, ge=1, le=50)
    offset: int = Field(default=0, ge=0)

class SavedReportsResponse(BaseModel):
    reports: List[SavedReportSummary]
    total: int
    has_more: bool