"""
FastAPI router for safety report generation and retrieval.
"""

import logging

from fastapi import APIRouter, HTTPException

from ..models.schemas import ReportResponse
from ..services.supabase_client import get_supabase

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/video/{video_id}/report", response_model=ReportResponse)
def get_report(video_id: str) -> ReportResponse:
    """
    Retrieve or generate the LLM safety report for a completed video.

    If the report is already stored in the DB, returns it immediately.
    Otherwise, triggers report generation and stores it before returning.

    Args:
        video_id: UUID of the video.

    Returns:
        ReportResponse containing the safety report text.
    """
    supabase = get_supabase()

    # Fetch video record
    try:
        result = supabase.table("videos").select("*").eq("id", video_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail=f"Video {video_id} not found.")

    video = result.data

    if video.get("report"):
        # Report already generated — return cached version
        logger.info(f"Returning cached report for video {video_id}")
        return ReportResponse(video_id=video_id, report=video["report"])

    if video["status"] != "completed":
        raise HTTPException(
            status_code=409,
            detail=f"Cannot generate report: video status is '{video['status']}'. "
                   "Video must be fully processed first.",
        )

    # Fetch violations for report generation
    violations_result = (
        supabase.table("violations")
        .select("*")
        .eq("video_id", video_id)
        .execute()
    )
    violations = violations_result.data

    # Generate report via LLM
    logger.info(f"Generating report for video {video_id} ({len(violations)} violations)")
    from worker.llm_report import generate_report
    report_text = generate_report(video_id, violations, video.get("risk_score", 0.0))

    # Cache the report in DB
    supabase.table("videos").update({"report": report_text}).eq("id", video_id).execute()

    return ReportResponse(video_id=video_id, report=report_text)
