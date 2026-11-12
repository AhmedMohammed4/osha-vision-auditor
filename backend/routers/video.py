"""
FastAPI router for video upload, processing, and retrieval endpoints.
"""

import hashlib
import logging
import os
import uuid
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from supabase import Client

from worker.openai_client import MODEL
from worker.pipeline import AUDIT_VERSION, process_video

from ..models.schemas import UploadResponse, ProcessResponse, SavedDemo, Video, Violation, VideoStatus
from ..services.audit_copy import public_audit_text
from ..services.audit_jobs import expire_stalled_run, utc_now
from ..services.auth import require_user_id
from ..services.supabase_client import get_supabase
from ..services.storage import upload_video

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_EXTENSIONS = {"mp4", "mov", "avi", "webm", "mkv"}
MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024  # 100 MB


@router.post("/upload-video", response_model=UploadResponse)
def upload_video_endpoint(
    file: UploadFile = File(...),
    owner_id: str = Depends(require_user_id),
) -> UploadResponse:
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
    file_bytes = file.file.read(MAX_FILE_SIZE_BYTES + 1)

    # Validate size
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(file_bytes) / 1024 / 1024:.1f} MB). Maximum is 100 MB.",
        )

    if len(file_bytes) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    # Identical bytes reuse the same audit for this owner and analysis version.
    digest = hashlib.sha256(file_bytes).hexdigest()
    video_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"osha-vision:{AUDIT_VERSION}:{MODEL}:{owner_id}:{digest}"))
    supabase = get_supabase()
    existing = _find_owned_video(supabase, video_id, owner_id)
    while existing and existing["status"] == VideoStatus.cancelled.value:
        video_id = str(uuid.uuid5(uuid.UUID(video_id), "retry-after-cancellation"))
        existing = _find_owned_video(supabase, video_id, owner_id)
    if existing:
        return UploadResponse(video_id=video_id, status=VideoStatus(existing["status"]))
    storage_filename = f"{video_id}.{ext}"

    logger.info(f"Uploading video: {original_name} → {storage_filename} ({len(file_bytes)} bytes)")

    # Upload to Supabase Storage
    try:
        video_url = upload_video(file_bytes, storage_filename)
    except Exception as exc:
        logger.error(f"Storage upload failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(exc)}")

    # Insert video record into DB
    try:
        supabase.table("videos").insert(
            {
                "id": video_id,
                "filename": storage_filename,
                "status": VideoStatus.uploaded.value,
                "video_url": video_url,
                "owner_id": owner_id,
            }
        ).execute()
    except Exception as exc:
        # Another request may have inserted this upload while storage was writing.
        existing = _find_owned_video(supabase, video_id, owner_id)
        if existing and existing["status"] != VideoStatus.cancelled.value:
            return UploadResponse(video_id=video_id, status=VideoStatus(existing["status"]))
        logger.error(f"DB insert failed: {exc}")
        raise HTTPException(status_code=500, detail=f"Database insert failed: {str(exc)}")

    logger.info(f"Video record created: {video_id}")
    return UploadResponse(video_id=video_id, status=VideoStatus.uploaded)


@router.post("/process-video/{video_id}", response_model=ProcessResponse)
def process_video_endpoint(
    video_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    owner_id: str = Depends(require_user_id),
) -> ProcessResponse:
    """
    Start a background video audit.

    Returns immediately after queueing the pipeline. The frontend polls
    GET /video/{video_id} until status changes to 'completed' or 'failed'.

    Args:
        video_id: UUID of the video to process.

    Returns:
        ProcessResponse confirming processing has been queued.
    """
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=503, detail="Video analysis is not configured yet.")

    video_id = str(video_id)
    supabase = get_supabase()
    video = expire_stalled_run(supabase, _owned_video(supabase, video_id, owner_id))
    if video["status"] in ("processing", "completed"):
        return ProcessResponse(video_id=video_id, message="Audit already started.")
    if video["status"] == "cancelled":
        raise HTTPException(409, "This audit was cancelled. Select a video to start a new audit.")

    run_id = str(uuid.uuid4())
    query = (
        supabase.table("videos")
        .update({
            "status": "processing",
            "run_id": run_id,
            "progress": {"stage": "queued"},
            "processing_updated_at": utc_now(),
            "report": None,
        })
        .eq("id", video_id)
        .eq("owner_id", owner_id)
        .eq("status", video["status"])
    )
    if video.get("run_id"):
        query = query.eq("run_id", video["run_id"])
    else:
        query = query.is_("run_id", "null")
    if query.execute().data:
        background_tasks.add_task(process_video, video_id, run_id, video["filename"])
        logger.info("Pipeline queued for video %s", video_id)
        return ProcessResponse(video_id=video_id, message="Processing started.")
    return ProcessResponse(video_id=video_id, message="Audit already started.")


@router.post("/video/{video_id}/cancel", response_model=ProcessResponse)
def cancel_video(video_id: uuid.UUID, owner_id: str = Depends(require_user_id)) -> ProcessResponse:
    video_id = str(video_id)
    supabase = get_supabase()
    result = (
        supabase.table("videos")
        .update({"status": "cancelled", "progress": None, "processing_updated_at": utc_now()})
        .eq("id", video_id)
        .eq("owner_id", owner_id)
        .eq("status", "processing")
        .execute()
    )
    if not result.data and _owned_video(supabase, video_id, owner_id)["status"] != "cancelled":
        raise HTTPException(409, "This audit is no longer processing.")
    return ProcessResponse(video_id=video_id, message="Audit cancelled.")


def _find_owned_video(supabase: Client, video_id: str, owner_id: str) -> dict | None:
    result = (
        supabase.table("videos").select("*")
        .eq("id", video_id).eq("owner_id", owner_id).limit(1).execute()
    )
    return result.data[0] if result.data else None


def _owned_video(supabase: Client, video_id: str, owner_id: str) -> dict:
    video = _find_owned_video(supabase, video_id, owner_id)
    if video is None:
        raise HTTPException(404, "Audit not found.")
    return video


@router.get("/demo", response_model=SavedDemo, dependencies=[Depends(require_user_id)])
def get_saved_demo() -> SavedDemo:
    result = (
        get_supabase().table("videos").select("id")
        .eq("is_demo", True).eq("status", "completed").limit(1).execute()
    )
    if not result.data:
        raise HTTPException(404, "No saved demo is available.")
    return SavedDemo(video_id=result.data[0]["id"])


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

    row = expire_stalled_run(supabase, result.data)
    return Video(
        id=row["id"],
        filename=row["filename"],
        status=VideoStatus(row["status"]),
        risk_score=row.get("risk_score"),
        report=public_audit_text(row.get("report")),
        video_url=row.get("video_url"),
        duration=row.get("duration"),
        uploaded_at=str(row.get("uploaded_at", "")),
        progress=row.get("progress"),
        is_demo=row.get("is_demo", False),
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
            report=public_audit_text(row.get("report")),
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
            description=public_audit_text(row.get("description")),
        )
        for row in result.data
    ]
