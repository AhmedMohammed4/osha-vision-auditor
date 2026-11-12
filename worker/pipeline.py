"""Analyze worksite videos with bounded memory and cooperative cancellation."""

import logging
import math
import os
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from itertools import islice

import cv2
import numpy as np

from backend.services.audit_jobs import MAX_VIDEO_SECONDS, update_run
from backend.services.storage import download_video, upload_frame
from backend.services.supabase_client import get_supabase

from .detector import detect_violations
from .llm_report import generate_report
from .openai_client import analysis_failure_message
from .risk_scorer import compute_risk_score

logger = logging.getLogger(__name__)

# Increment when detection or scoring rules change to invalidate upload reuse.
AUDIT_VERSION = "2026-11-11-evidence-v3"

_MAX_WORKERS = 8
_SAMPLE_EVERY_SECONDS = 2.0
_TOO_LONG = f"Choose a clip no longer than {MAX_VIDEO_SECONDS // 60} minutes."


class VideoInputError(ValueError):
    """An input problem that can be shown directly to the user."""


def process_video(video_id: str, run_id: str, filename: str) -> None:
    supabase = get_supabase()
    started = time.monotonic()
    tmp_path = ""
    capture = None

    try:
        with tempfile.NamedTemporaryFile(suffix=os.path.splitext(filename)[1], delete=False) as tmp:
            tmp_path = tmp.name
            tmp.write(download_video(filename))

        capture = _open_video(tmp_path)
        fps = capture.get(cv2.CAP_PROP_FPS)
        if not math.isfinite(fps) or fps <= 0:
            fps = 25.0
        reported_frames = capture.get(cv2.CAP_PROP_FRAME_COUNT)
        seekable = math.isfinite(reported_frames) and 0 < reported_frames < 10**12
        if seekable:
            frame_count = int(reported_frames)
        else:
            # Browser recordings can omit the duration and frame count.
            frame_count = _count_frames(capture, fps)
            capture.release()
            capture = _open_video(tmp_path)

        duration = frame_count / fps
        if duration > MAX_VIDEO_SECONDS:
            raise VideoInputError(_TOO_LONG)
        if not frame_count:
            raise VideoInputError("This clip contains no readable video frames.")

        frame_step = max(1, round(fps * _SAMPLE_EVERY_SECONDS))
        targets = range(0, frame_count, frame_step)
        total = len(targets)
        if not update_run(
            supabase, video_id, run_id, duration=duration,
            progress={"stage": "analyzing", "frames_done": 0, "frames_total": total},
        ):
            return

        def analyze(sample: tuple[float, np.ndarray]) -> tuple[float, np.ndarray, list[dict]]:
            timestamp, frame = sample
            return timestamp, frame, detect_violations(frame, timestamp)

        def save_evidence(result: tuple[float, np.ndarray, list[dict]]) -> list[dict]:
            timestamp, frame, findings = result
            success, jpeg = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not success:
                raise RuntimeError(f"Failed to encode evidence frame at {timestamp:.2f}s")
            frame_url = upload_frame(jpeg.tobytes(), video_id, timestamp)
            return [{**finding, "timestamp": timestamp, "frame_url": frame_url} for finding in findings]

        all_findings: list[dict] = []
        analyzed = 0
        samples = _sample_frames(capture, fps, targets, seekable)
        with ThreadPoolExecutor(max_workers=_MAX_WORKERS) as executor:
            for offset in range(0, total, _MAX_WORKERS):
                batch = list(islice(samples, _MAX_WORKERS))
                results = list(executor.map(analyze, batch))
                for findings in executor.map(save_evidence, (result for result in results if result[2])):
                    all_findings.extend(findings)
                analyzed += len(batch)
                del batch, results

                last_batch = offset + _MAX_WORKERS >= total
                if last_batch and not analyzed:
                    raise VideoInputError("This clip contains no readable video frames.")
                # This conditional write also stops a cancelled or superseded run.
                if not update_run(supabase, video_id, run_id, progress={
                    "stage": "report" if last_batch else "analyzing",
                    "frames_done": analyzed,
                    "frames_total": analyzed if last_batch else total,
                }):
                    return

        risk_score = compute_risk_score(all_findings, analyzed)
        report = generate_report(video_id, all_findings, risk_score)
        result = supabase.rpc("finish_audit", {
            "p_video_id": video_id,
            "p_run_id": run_id,
            "p_risk_score": risk_score,
            "p_report": report,
            "p_findings": all_findings,
        }).execute()
        if result.data:
            logger.info("Audit %s completed in %.1fs", video_id, time.monotonic() - started)

    except Exception as error:
        logger.exception("Audit %s failed", video_id)
        message = (
            f"Video analysis could not finish. {error}"
            if isinstance(error, VideoInputError)
            else analysis_failure_message(error)
        )
        try:
            update_run(get_supabase(), video_id, run_id, status="failed", report=message, progress=None)
        except Exception:
            logger.exception("Could not save failure status for audit %s", video_id)
    finally:
        if capture is not None:
            capture.release()
        if tmp_path:
            try:
                os.unlink(tmp_path)
            except OSError:
                logger.warning("Could not remove temporary video for audit %s", video_id)


def _open_video(path: str) -> cv2.VideoCapture:
    capture = cv2.VideoCapture(path)
    if not capture.isOpened():
        capture.release()
        raise VideoInputError("This video could not be opened. Try exporting it as MP4.")
    return capture


def _count_frames(capture: cv2.VideoCapture, fps: float) -> int:
    limit = math.floor(fps * MAX_VIDEO_SECONDS)
    for count in range(limit + 1):
        if not capture.grab():
            return count
    raise VideoInputError(_TOO_LONG)


def _sample_frames(capture: cv2.VideoCapture, fps: float, targets: range, seekable: bool):
    position = 0
    for target in targets:
        if seekable:
            capture.set(cv2.CAP_PROP_POS_FRAMES, target)
        else:
            while position < target:
                if not capture.grab():
                    return
                position += 1
        success, frame = capture.read()
        if success:
            yield target / fps, frame
        elif not seekable:
            return
        position = target + 1
