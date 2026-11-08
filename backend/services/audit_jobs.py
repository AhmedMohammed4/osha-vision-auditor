"""Updates shared by the audit API and background worker."""

from datetime import datetime, timedelta, timezone

from supabase import Client

MAX_VIDEO_SECONDS = 120
_STALL_TIMEOUT = timedelta(minutes=3)
_INTERRUPTED = "Video analysis could not finish. The worker stopped responding. You can retry this upload."


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def update_run(client: Client, video_id: str, run_id: str, **values) -> bool:
    result = (
        client.table("videos")
        .update({**values, "processing_updated_at": utc_now()})
        .eq("id", video_id)
        .eq("run_id", run_id)
        .eq("status", "processing")
        .execute()
    )
    return bool(result.data)


def expire_stalled_run(client: Client, video: dict) -> dict:
    if video["status"] != "processing":
        return video
    last_update = video.get("processing_updated_at") or video.get("uploaded_at")
    if not last_update:
        return video
    if datetime.now(timezone.utc) - datetime.fromisoformat(last_update) < _STALL_TIMEOUT:
        return video

    query = (
        client.table("videos")
        .update({"status": "failed", "report": _INTERRUPTED, "progress": None})
        .eq("id", video["id"])
        .eq("status", "processing")
    )
    if video.get("processing_updated_at"):
        query = query.eq("processing_updated_at", last_update)
    else:
        query = query.is_("processing_updated_at", "null")
    result = query.execute()
    return result.data[0] if result.data else video
