"""Pydantic schemas for request/response models."""

from enum import Enum
from typing import Literal, Optional
from pydantic import BaseModel


class VideoStatus(str, Enum):
    """Possible states of a video record."""
    uploaded = "uploaded"
    processing = "processing"
    completed = "completed"
    failed = "failed"
    cancelled = "cancelled"


class AuditProgress(BaseModel):
    stage: Literal["queued", "analyzing", "report"]
    frames_done: int = 0
    frames_total: int = 0


class Video(BaseModel):
    """Represents a video record from the database."""
    id: str
    filename: str
    status: VideoStatus
    risk_score: Optional[float] = None
    report: Optional[str] = None
    video_url: Optional[str] = None
    duration: Optional[float] = None
    uploaded_at: str
    progress: Optional[AuditProgress] = None
    is_demo: bool = False


class SavedDemo(BaseModel):
    video_id: str


class Violation(BaseModel):
    """Represents a single OSHA violation detected in a video frame."""
    id: str
    video_id: str
    timestamp: float
    violation_type: str
    confidence: float
    frame_url: Optional[str] = None
    description: Optional[str] = None


class UploadResponse(BaseModel):
    """Response for video upload endpoint."""
    video_id: str
    status: VideoStatus


class ProcessResponse(BaseModel):
    """Response for process video endpoint."""
    video_id: str
    message: str


class ReportResponse(BaseModel):
    """Response for report generation endpoint."""
    video_id: str
    report: str
