# services/api/claimlens/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging, os
from .models import AnalyzeRequest, AnalyzeResponse, SavedReportsRequest, SavedReportsResponse, SavedReportSummary
from .pipeline import run_pipeline
from .deps import get_settings
from dotenv import load_dotenv
from pathlib import Path
from fastapi.encoders import jsonable_encoder
from .youtube import extract_video_id
from datetime import datetime
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
        # Short-circuit: if we've already analyzed this video, return the latest saved report
        try:
            from .db import db
            video_id = extract_video_id(str(req.url))
            if video_id:
                existing = await db.get_latest_report_by_video_id(video_id)
                if existing and existing.get("data"):
                    data = existing["data"] or {}
                    data["reportId"] = existing.get("id")
                    return AnalyzeResponse(**data)
        except Exception as e:
            logging.warning(f"Pre-check for existing report failed: {e}")
        
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

@app.get("/saved-reports", response_model=SavedReportsResponse)
async def get_saved_reports(limit: int = 5, offset: int = 0):
    """Get saved reports with pagination."""
    try:
        from .db import db
        
        # Validate parameters
        if limit < 1 or limit > 50:
            raise HTTPException(status_code=400, detail="Limit must be between 1 and 50")
        if offset < 0:
            raise HTTPException(status_code=400, detail="Offset must be non-negative")
        
        result = await db.get_saved_reports(limit=limit, offset=offset)
        
        # Transform the raw database results into SavedReportSummary objects
        reports = []
        for report_row in result["reports"]:
            try:
                data = report_row.get("data", {})
                if not data:
                    continue
                    
                # Parse created_at string to datetime
                created_at_str = report_row.get("created_at")
                try:
                    if created_at_str:
                        # Handle both Z and +00:00 timezone formats, and normalize microseconds
                        normalized_str = created_at_str.replace('Z', '+00:00')
                        # Ensure microseconds are exactly 6 digits (Python requirement)
                        if '.' in normalized_str and '+' in normalized_str:
                            dt_part, tz_part = normalized_str.rsplit('+', 1)
                            if '.' in dt_part:
                                base_part, microsec_part = dt_part.split('.')
                                # Pad or truncate to exactly 6 digits
                                microsec_part = microsec_part.ljust(6, '0')[:6]
                                normalized_str = f"{base_part}.{microsec_part}+{tz_part}"
                        created_at = datetime.fromisoformat(normalized_str)
                    else:
                        created_at = datetime.now()
                except Exception as e:
                    logging.warning(f"Failed to parse datetime '{created_at_str}' for report {report_row.get('id')}: {e}")
                    created_at = datetime.now()
                
                summary = SavedReportSummary(
                    id=report_row["id"],
                    video=data.get("video", {}),
                    consensus=data.get("consensus", {}),
                    created_at=created_at
                )
                reports.append(summary)
            except Exception as e:
                logging.warning(f"Failed to parse saved report {report_row.get('id')}: {e}")
                continue
        
        return SavedReportsResponse(
            reports=reports,
            total=result["total"],
            has_more=result["has_more"]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error in get_saved_reports endpoint")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/saved-reports/{report_id}", response_model=AnalyzeResponse)
async def get_saved_report(report_id: str):
    """Get a specific saved report by ID."""
    try:
        from .db import db
        
        report_row = await db.get_report_by_id(report_id)
        if not report_row:
            raise HTTPException(status_code=404, detail="Report not found")
        
        data = report_row.get("data", {})
        if not data:
            raise HTTPException(status_code=404, detail="Report data not found")
        
        # Add the report ID to the response
        data["reportId"] = report_row["id"]
        
        return AnalyzeResponse(**data)
        
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error in get_saved_report endpoint")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.delete("/saved-reports/{report_id}", status_code=204)
async def delete_saved_report(report_id: str):
    """Delete a saved report by ID."""
    try:
        from .db import db
        deleted = await db.delete_report(report_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Report not found")
        # 204 No Content
        return
    except HTTPException:
        raise
    except Exception:
        logging.exception("Error in delete_saved_report endpoint")
        raise HTTPException(status_code=500, detail="Internal server error")
