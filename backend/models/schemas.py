"""Pydantic schemas for request/response models."""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel


class VideoStatus(str, Enum):
    """Possible states of a video record."""
    uploaded = "uploaded"
    processing = "processing"
    completed = "completed"
    failed = "failed"


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


class LiveViolation(BaseModel):
    """Represents a violation detected from a live-capture frame."""
    timestamp: float
    violation_type: str
    confidence: float
    description: Optional[str] = None
    osha_citation: Optional[str] = None
    osha_reference_text: Optional[str] = None


class LiveFrameAnalysisResponse(BaseModel):
    """Response for a single live frame analysis request."""
    timestamp: float
    violations: List[LiveViolation]
