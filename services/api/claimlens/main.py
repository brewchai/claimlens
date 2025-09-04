# services/api/claimlens/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging, os
from .models import AnalyzeRequest, AnalyzeResponse
from .pipeline import run_pipeline
from .deps import get_settings
from dotenv import load_dotenv
from pathlib import Path
from fastapi.encoders import jsonable_encoder
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

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
        # Run the analysis pipeline
        result = await run_pipeline(req)
        
        # Save the report to the database
        try:
            from .db import db
            # Ensure JSON-serializable payload (handles HttpUrl, datetime, etc.)
            report_data = jsonable_encoder(result)
            report_id = await db.save_report(report_data)
            # Add the report ID to the response
            result.reportId = report_id
        except Exception as e:
            # Log the error but don't fail the request
            import logging
            logging.error(f"Failed to save report: {str(e)}")
            
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logging.exception("Error in analyze endpoint")
        raise HTTPException(status_code=500, detail="Internal server error")
