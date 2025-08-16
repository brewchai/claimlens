from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional, Literal

Rating = Literal["high","medium","low"]

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
    meta: dict
    videoSummary: str
