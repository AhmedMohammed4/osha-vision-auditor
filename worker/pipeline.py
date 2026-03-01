"""
Main video processing pipeline for OSHA Vision Auditor.

Orchestrates: download → frame extraction → detection → violation storage
             → risk scoring → LLM report → DB update.
"""

import logging
import os
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List, Tuple

import cv2
import numpy as np

from .detector import detect_violations
from .risk_scorer import compute_risk_score
from .llm_report import generate_report

logger = logging.getLogger(__name__)

# Concurrent Claude Vision API calls — I/O-bound HTTP so true parallelism via threads.
# 8 workers keeps throughput high without hammering rate limits.
_MAX_WORKERS = 8

# Sample 1 frame every N seconds of video.
# 2s = good violation coverage at half the API cost of 1fps.
_SAMPLE_EVERY_SECONDS = 2.0


def process_video(video_id: str) -> None:
    """
    Full processing pipeline for a single video.

    Steps:
        1. Mark video as 'processing' in DB.
        2. Download video bytes from Supabase Storage.
        3. Write to a temporary file for OpenCV.
        4. Seek directly to target frames (1 per 2s) — no wasted reads.
        5. Run Claude Vision on all sampled frames concurrently.
        6. Upload violation frames to Supabase Storage.
        7. Bulk insert violations into DB.
        8. Compute risk score.
        9. Generate LLM safety report.
        10. Update video record: status='completed', risk_score, report.

    On any unhandled exception, sets video status to 'failed'.

    Args:
        video_id: UUID string of the video record to process.
    """
    # Import here to avoid circular imports (backend imports worker)
    from backend.services.supabase_client import get_supabase
    from backend.services.storage import download_video, upload_frame

    supabase = get_supabase()
    tmp_path: str = ""

    try:
        logger.info(f"[{video_id}] Pipeline started.")
        start_time = time.time()

        # Step 1 — Mark as processing
        supabase.table("videos").update({"status": "processing"}).eq("id", video_id).execute()

        # Step 2 — Fetch video record for filename
        result = supabase.table("videos").select("*").eq("id", video_id).single().execute()
        video_record = result.data
        filename: str = video_record["filename"]

        logger.info(f"[{video_id}] Downloading video: {filename}")

        # Step 3 — Download and write to temp file
        video_bytes = download_video(filename)

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
            tmp.write(video_bytes)
            tmp_path = tmp.name

        logger.info(f"[{video_id}] Video written to temp: {tmp_path} ({len(video_bytes)} bytes)")

        # Step 4 — Open with OpenCV and gather metadata
        cap = cv2.VideoCapture(tmp_path)
        if not cap.isOpened():
            raise RuntimeError(f"OpenCV could not open video file: {tmp_path}")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        duration = total_frames / fps if fps > 0 else 0.0
        frame_step = max(1, int(round(fps * _SAMPLE_EVERY_SECONDS)))

        logger.info(
            f"[{video_id}] Video metadata: fps={fps:.2f}, "
            f"total_frames={total_frames}, duration={duration:.1f}s, "
            f"sampling every {_SAMPLE_EVERY_SECONDS}s ({frame_step} frames)"
        )

        # Update duration in DB
        supabase.table("videos").update({"duration": duration}).eq("id", video_id).execute()

        # Step 4 — Seek directly to each target frame (skips unused frames entirely)
        sampled_frames: List[Tuple[np.ndarray, float]] = []
        target = 0
        while target < total_frames:
            cap.set(cv2.CAP_PROP_POS_FRAMES, target)
            ret, frame = cap.read()
            if ret:
                sampled_frames.append((frame.copy(), target / fps))
            target += frame_step

        cap.release()

        sampled_count = len(sampled_frames)
        logger.info(
            f"[{video_id}] Collected {sampled_count} frames in "
            f"{time.time() - start_time:.1f}s. "
            f"Running Claude Vision concurrently (workers={_MAX_WORKERS})..."
        )

        # Step 5 — Run Claude Vision on all frames concurrently
        def _detect(args: Tuple[np.ndarray, float]) -> Tuple[float, np.ndarray, List[Dict[str, Any]]]:
            frm, ts = args
            return ts, frm, detect_violations(frm, ts)

        detection_results: List[Tuple[float, np.ndarray, List[Dict[str, Any]]]] = []
        with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as executor:
            futures = {executor.submit(_detect, item): item for item in sampled_frames}
            for future in as_completed(futures):
                try:
                    detection_results.append(future.result())
                except Exception as exc:
                    logger.error(f"[{video_id}] Detection error: {exc}")

        # Step 6 — Upload violation frames and collect violations (ordered by timestamp)
        detection_results.sort(key=lambda x: x[0])
        all_violations: List[Dict[str, Any]] = []

        for timestamp, frame, frame_violations in detection_results:
            if frame_violations:
                frame_url = _encode_and_upload_frame(frame, video_id, timestamp, upload_frame)
                for v in frame_violations:
                    v["timestamp"] = timestamp
                    v["frame_url"] = frame_url
                    v["video_id"] = video_id
                all_violations.extend(frame_violations)
                logger.debug(f"[{video_id}] t={timestamp:.1f}s: {len(frame_violations)} violation(s)")

        logger.info(
            f"[{video_id}] Analysis complete in {time.time() - start_time:.1f}s. "
            f"Sampled {sampled_count} frames, found {len(all_violations)} violations."
        )

        # Step 7 — Bulk insert violations
        if all_violations:
            violation_rows = [
                {
                    "video_id": v["video_id"],
                    "timestamp": v["timestamp"],
                    "violation_type": v["violation_type"],
                    "confidence": v.get("confidence", 0.0),
                    "frame_url": v.get("frame_url"),
                    "description": v.get("description"),
                }
                for v in all_violations
            ]
            supabase.table("violations").insert(violation_rows).execute()
            logger.info(f"[{video_id}] Inserted {len(violation_rows)} violations to DB.")

        # Step 8 — Compute risk score
        risk_score = compute_risk_score(all_violations, sampled_count)

        # Step 9 — Generate LLM report
        logger.info(f"[{video_id}] Generating LLM safety report...")
        report_text = generate_report(video_id, all_violations, risk_score)

        # Step 10 — Update video record as completed
        supabase.table("videos").update(
            {
                "status": "completed",
                "risk_score": risk_score,
                "report": report_text,
            }
        ).eq("id", video_id).execute()

        elapsed = time.time() - start_time
        logger.info(
            f"[{video_id}] Pipeline completed in {elapsed:.1f}s. "
            f"Risk score: {risk_score}"
        )

    except Exception as exc:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"[{video_id}] Pipeline failed: {exc}\n{error_detail}")
        try:
            from backend.services.supabase_client import get_supabase as _get_sb
            _get_sb().table("videos").update({
                "status": "failed",
                "report": f"PIPELINE ERROR:\n{error_detail}",
            }).eq("id", video_id).execute()
        except Exception:
            pass
        raise

    finally:
        # Always clean up temp file
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.unlink(tmp_path)
                logger.debug(f"[{video_id}] Temp file removed: {tmp_path}")
            except OSError:
                pass


def _encode_and_upload_frame(
    frame: np.ndarray,
    video_id: str,
    timestamp: float,
    upload_fn,
) -> str:
    """
    JPEG-encode a frame and upload it to Supabase Storage.

    Args:
        frame: BGR numpy array.
        video_id: Parent video ID.
        timestamp: Frame timestamp in seconds.
        upload_fn: Storage upload callable.

    Returns:
        Public URL of the uploaded frame.
    """
    success, buffer = cv2.imencode(
        ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85]
    )
    if not success:
        raise RuntimeError(f"Failed to encode frame at t={timestamp:.2f}s")

    return upload_fn(buffer.tobytes(), video_id, timestamp)
