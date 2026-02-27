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
  violation_type: "helmet_violation" | "vest_violation";
  confidence: number;
  frame_url: string | null;
}

export interface UploadResponse {
  video_id: string;
  status: VideoStatus;
}

export interface ReportResponse {
  video_id: string;
  report: string;
}
