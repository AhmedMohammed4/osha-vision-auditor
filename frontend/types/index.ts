export type VideoStatus = "uploaded" | "processing" | "completed" | "failed";

export interface Video {
  id: string;
  filename: string;
  status: VideoStatus;
  risk_score: number | null;
  report: string | null;
  video_url: string | null;
  duration: number | null;
  uploaded_at: string;
}

export interface Violation {
  id: string;
  video_id: string;
  timestamp: number;
  violation_type: string;
  confidence: number;
  frame_url: string | null;
  description: string | null;
}

export interface UploadResponse {
  video_id: string;
  status: VideoStatus;
}

export interface ReportResponse {
  video_id: string;
  report: string;
}

export interface LiveViolation {
  timestamp: number;
  violation_type: string;
  confidence: number;
  description: string | null;
  osha_citation: string | null;
  osha_reference_text: string | null;
}

export interface LiveFrameAnalysisResponse {
  timestamp: number;
  violations: LiveViolation[];
}
