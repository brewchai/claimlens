# services/api/claimlens/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging, os
from .models import AnalyzeRequest, AnalyzeResponse
from .pipeline import run_pipeline
from .deps import get_settings

s = get_settings()
app = FastAPI(title="ClaimLens API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=s.CORS_ALLOW_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"ok": True}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest):
    try:
        return await run_pipeline(req)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.exception("Analyze failed: %s", e)
        if s.CLAIMLENS_DEBUG:
            raise HTTPException(status_code=500, detail=str(e))
        raise HTTPException(status_code=500, detail="Internal error")
