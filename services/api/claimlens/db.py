"""Database module for handling Supabase operations."""
from typing import Optional, Dict, Any
import uuid
from supabase import create_client, Client
from .deps import get_settings

settings = get_settings()

class Database:
    _instance = None
    _client: Optional[Client] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._instance._initialize_client()
        return cls._instance
    
    def _initialize_client(self):
        """Initialize the Supabase client."""
        if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
            raise ValueError("Supabase URL and key must be configured")
        self._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    
    async def save_report(self, report_data: Dict[str, Any]) -> str:
        """
        Save a report to the database.
        
        Args:
            report_data: The report data to save
            
        Returns:
            str: The ID of the saved report (existing one if already present for video_id)
            
        Raises:
            Exception: If there's an error saving the report
        """
        if not self._client:
            self._initialize_client()
            
        # Try to dedupe by video_id
        video_id = None
        try:
            video_id = report_data.get("video", {}).get("id")
        except Exception:
            video_id = None
        
        if video_id:
            try:
                existing = (
                    self._client
                    .table(settings.SUPABASE_TABLE)
                    .select("id")
                    .eq("video_id", video_id)
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                )
                if existing.data and len(existing.data) > 0 and existing.data[0].get("id"):
                    return existing.data[0]["id"]
            except Exception:
                # If the existence check fails for any reason, fall back to inserting
                pass
            
        report_id = str(uuid.uuid4())
        
        # Prepare the report data for storage
        report = {
            "id": report_id,
            "data": report_data,
            "video_id": video_id,
            "created_at": "now()",
        }
        
        try:
            # Insert the report into the Supabase table
            response = self._client.table(settings.SUPABASE_TABLE).insert(report).execute()
            
            if not response.data:
                raise Exception("Failed to save report: No data returned from database")
                
            return report_id
            
        except Exception as e:
            raise Exception(f"Failed to save report: {str(e)}")

    async def get_latest_report_by_video_id(self, video_id: str) -> Optional[Dict[str, Any]]:
        """Return the latest report row (id, data, video_id, created_at) for a given video_id, or None."""
        if not self._client:
            self._initialize_client()
        try:
            res = (
                self._client
                .table(settings.SUPABASE_TABLE)
                .select("id,data,video_id,created_at")
                .eq("video_id", video_id)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            if res.data and len(res.data) > 0:
                return res.data[0]
            return None
        except Exception as e:
            raise Exception(f"Failed to fetch report: {str(e)}")

    async def get_saved_reports(self, limit: int = 5, offset: int = 0) -> Dict[str, Any]:
        """
        Get saved reports with pagination.
        
        Args:
            limit: Number of reports to return (1-50)
            offset: Number of reports to skip
            
        Returns:
            Dict containing reports, total count, and has_more flag
        """
        if not self._client:
            self._initialize_client()
        
        try:
            # Get total count
            count_response = (
                self._client
                .table(settings.SUPABASE_TABLE)
                .select("id", count="exact")
                .execute()
            )
            total = count_response.count or 0
            
            # Get paginated reports
            response = (
                self._client
                .table(settings.SUPABASE_TABLE)
                .select("id,data,video_id,created_at")
                .order("created_at", desc=True)
                .range(offset, offset + limit - 1)
                .execute()
            )
            
            reports = response.data or []
            has_more = offset + limit < total
            
            return {
                "reports": reports,
                "total": total,
                "has_more": has_more
            }
            
        except Exception as e:
            raise Exception(f"Failed to fetch saved reports: {str(e)}")
    
    async def get_report_by_id(self, report_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific report by ID.
        
        Args:
            report_id: The ID of the report to fetch
            
        Returns:
            The report data or None if not found
        """
        if not self._client:
            self._initialize_client()
        
        try:
            response = (
                self._client
                .table(settings.SUPABASE_TABLE)
                .select("id,data,video_id,created_at")
                .eq("id", report_id)
                .limit(1)
                .execute()
            )
            
            if response.data and len(response.data) > 0:
                return response.data[0]
            return None
            
        except Exception as e:
            raise Exception(f"Failed to fetch report by ID: {str(e)}")
    
    async def delete_report(self, report_id: str) -> bool:
        """Delete a report by ID. Returns True if deleted, False if not found."""
        if not self._client:
            self._initialize_client()
        
        # Ensure it exists first to provide a precise 404 upstream
        existing = await self.get_report_by_id(report_id)
        if not existing:
            return False
        
        try:
            _ = (
                self._client
                .table(settings.SUPABASE_TABLE)
                .delete()
                .eq("id", report_id)
                .execute()
            )
            return True
        except Exception as e:
            raise Exception(f"Failed to delete report: {str(e)}")

# Create a singleton instance
db = Database()
