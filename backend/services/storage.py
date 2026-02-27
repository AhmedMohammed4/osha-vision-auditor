"""Supabase Storage helpers for video and frame management."""

import logging
from pathlib import Path
from .supabase_client import get_supabase

logger = logging.getLogger(__name__)

VIDEOS_BUCKET = "videos"
FRAMES_BUCKET = "frames"


def upload_video(file_bytes: bytes, filename: str) -> str:
    """
    Upload a video file to Supabase Storage.

    Args:
        file_bytes: Raw video bytes.
        filename: Destination filename in the bucket.

    Returns:
        Public URL of the uploaded video.
    """
    supabase = get_supabase()
    path = filename

    supabase.storage.from_(VIDEOS_BUCKET).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": "video/mp4", "upsert": "true"},
    )

    result = supabase.storage.from_(VIDEOS_BUCKET).get_public_url(path)
    logger.info(f"Uploaded video to Storage: {path}")
    return result


def download_video(filename: str) -> bytes:
    """
    Download a video file from Supabase Storage.

    Args:
        filename: Path/filename within the videos bucket.

    Returns:
        Raw video bytes.
    """
    supabase = get_supabase()
    data = supabase.storage.from_(VIDEOS_BUCKET).download(filename)
    logger.info(f"Downloaded video from Storage: {filename}")
    return data


def upload_frame(frame_bytes: bytes, video_id: str, timestamp: float) -> str:
    """
    Upload a violation frame image to Supabase Storage.

    Args:
        frame_bytes: JPEG image bytes.
        video_id: Parent video ID for path organization.
        timestamp: Frame timestamp in seconds.

    Returns:
        Public URL of the uploaded frame image.
    """
    supabase = get_supabase()
    path = f"{video_id}/{timestamp:.2f}.jpg"

    supabase.storage.from_(FRAMES_BUCKET).upload(
        path=path,
        file=frame_bytes,
        file_options={"content-type": "image/jpeg", "upsert": "true"},
    )

    result = supabase.storage.from_(FRAMES_BUCKET).get_public_url(path)
    logger.info(f"Uploaded frame to Storage: {path}")
    return result
