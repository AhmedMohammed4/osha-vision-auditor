export type VideoStatus = "uploaded" | "processing" | "completed" | "failed" | "cancelled";

export interface AuditProgress {
  stage: "queued" | "analyzing" | "report";
  frames_done: number;
  frames_total: number;
}

export interface Video {
  id: string;
  filename: string;
  status: VideoStatus;
  risk_score: number | null;
  report: string | null;
  video_url: string | null;
  duration: number | null;
  uploaded_at: string;
  progress?: AuditProgress | null;
  is_demo?: boolean;
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
