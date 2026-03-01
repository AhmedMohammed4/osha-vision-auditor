"""
FastAPI router for video upload, processing, and retrieval endpoints.
"""

import logging
import os
import uuid
from typing import List

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile, File

from ..models.schemas import UploadResponse, ProcessResponse, Video, Violation, VideoStatus
from ..services.supabase_client import get_supabase
from ..services.storage import upload_video

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_EXTENSIONS = {"mp4", "mov", "avi", "webm", "mkv"}
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB


@router.post("/upload-video", response_model=UploadResponse)
async def upload_video_endpoint(file: UploadFile = File(...)) -> UploadResponse:
    """
    Accept a video upload, store it in Supabase Storage, and create a DB record.

    Validates:
        - File extension must be in ALLOWED_EXTENSIONS.
        - File size must be ≤ 100 MB.

    Returns:
        UploadResponse with video_id and initial status.
    """
    # Validate extension
    original_name = file.filename or "video.mp4"
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '.{ext}'. Allowed: {ALLOWED_EXTENSIONS}",
        )

    # Read file bytes
    file_bytes = await file.read()

    # Validate size
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(file_bytes) / 1024 / 1024:.1f} MB). Maximum is 100 MB.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Generate a unique filename to prevent collisions
    video_id = str(uuid.uuid4())
    storage_filename = f"{video_id}.{ext}"

    logger.info(f"Uploading video: {original_name} → {storage_filename} ({len(file_bytes)} bytes)")

    # Upload to Supabase Storage
    try:
        video_url = upload_video(file_bytes, storage_filename)
    except Exception as exc:
        logger.error(f"Storage upload failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(exc)}")

    # Insert video record into DB
    supabase = get_supabase()
    try:
        result = supabase.table("videos").insert(
            {
                "id": video_id,
                "filename": storage_filename,
                "status": VideoStatus.uploaded.value,
                "video_url": video_url,
            }
        ).execute()
    except Exception as exc:
        logger.error(f"DB insert failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(exc)}")

    logger.info(f"Video record created: {video_id}")
    return UploadResponse(video_id=video_id, status=VideoStatus.uploaded)


@router.post("/process-video/{video_id}", response_model=ProcessResponse)
async def process_video_endpoint(video_id: str, background_tasks: BackgroundTasks) -> ProcessResponse:
    """
    Trigger background processing of an uploaded video.

    Returns immediately after queueing the pipeline. The frontend polls
    GET /video/{video_id} until status changes to 'completed' or 'failed'.

    Args:
        video_id: UUID of the video to process.

    Returns:
        ProcessResponse confirming processing has been queued.
    """
    # Verify the video exists and is in a processable state
    supabase = get_supabase()
    try:
        result = supabase.table("videos").select("id, status").eq("id", video_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail=f"Video {video_id} not found.")

    video = result.data
    if video["status"] not in (VideoStatus.uploaded.value, VideoStatus.failed.value):
        raise HTTPException(
            status_code=409,
            detail=f"Video is already in status '{video['status']}'.",
        )

    # Queue pipeline as a background task — returns immediately
    from worker.pipeline import process_video  # noqa: E402
    background_tasks.add_task(process_video, video_id)
    logger.info(f"Pipeline queued for video: {video_id}")

    return ProcessResponse(video_id=video_id, message="Processing started.")


@router.get("/video/{video_id}", response_model=Video)
def get_video(video_id: str) -> Video:
    """
    Retrieve the current state of a video record.

    Args:
        video_id: UUID of the video.

    Returns:
        Video schema with current status, risk_score, and metadata.
    """
    supabase = get_supabase()
    try:
        result = supabase.table("videos").select("*").eq("id", video_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail=f"Video {video_id} not found.")

    row = result.data
    return Video(
        id=row["id"],
        filename=row["filename"],
        status=VideoStatus(row["status"]),
        risk_score=row.get("risk_score"),
        report=row.get("report"),
        video_url=row.get("video_url"),
        duration=row.get("duration"),
        uploaded_at=str(row.get("uploaded_at", "")),
    )


@router.get("/videos", response_model=List[Video])
def list_videos() -> List[Video]:
    """
    Return all video records ordered by most recent upload first.
    """
    supabase = get_supabase()
    try:
        result = (
            supabase.table("videos")
            .select("*")
            .order("uploaded_at", desc=True)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch videos: {str(exc)}")

    return [
        Video(
            id=row["id"],
            filename=row["filename"],
            status=VideoStatus(row["status"]),
            risk_score=row.get("risk_score"),
            report=row.get("report"),
            video_url=row.get("video_url"),
            duration=row.get("duration"),
            uploaded_at=str(row.get("uploaded_at", "")),
        )
        for row in result.data
    ]


@router.get("/video/{video_id}/violations", response_model=List[Violation])
def get_violations(video_id: str) -> List[Violation]:
    """
    Retrieve all violations for a video, ordered by timestamp.

    Args:
        video_id: UUID of the video.

    Returns:
        List of Violation objects sorted by timestamp ascending.
    """
    supabase = get_supabase()
    try:
        result = (
            supabase.table("violations")
            .select("*")
            .eq("video_id", video_id)
            .order("timestamp", desc=False)
            .execute()
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to fetch violations: {str(exc)}")

    return [
        Violation(
            id=row["id"],
            video_id=row["video_id"],
            timestamp=row["timestamp"],
            violation_type=row["violation_type"],
            confidence=row["confidence"],
            frame_url=row.get("frame_url"),
            description=row.get("description"),
        )
        for row in result.data
    ]
