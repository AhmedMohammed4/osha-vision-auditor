import axios from "axios";
import type {
  LiveFrameAnalysisResponse,
  ReportResponse,
  UploadResponse,
  Video,
  Violation,
} from "@/types";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 300_000, // 5 min — processing can take time
});

/**
 * Upload a video file to the backend.
 * Returns the new video_id.
 */
export async function uploadVideo(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<UploadResponse>(
    "/api/upload-video",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return data;
}

/**
 * Trigger synchronous processing of an uploaded video.
 */
export async function startProcessing(videoId: string): Promise<void> {
  await apiClient.post(`/api/process-video/${videoId}`);
}

/**
 * Fetch all video records, most recent first.
 */
export async function getVideos(): Promise<Video[]> {
  const { data } = await apiClient.get<Video[]>("/api/videos");
  return data;
}

/**
 * Fetch the current state of a video record.
 */
export async function getVideo(videoId: string): Promise<Video> {
  const { data } = await apiClient.get<Video>(`/api/video/${videoId}`);
  return data;
}

/**
 * Fetch all violations for a video, sorted by timestamp.
 */
export async function getViolations(videoId: string): Promise<Violation[]> {
  const { data } = await apiClient.get<Violation[]>(
    `/api/video/${videoId}/violations`
  );
  return data;
}

/**
 * Fetch or generate the LLM safety report for a completed video.
 */
export async function getReport(videoId: string): Promise<ReportResponse> {
  const { data } = await apiClient.get<ReportResponse>(
    `/api/video/${videoId}/report`
  );
  return data;
}

/**
 * Analyze a single live-capture frame while recording.
 */
export async function analyzeFrame(
  image: Blob,
  timestamp: number
): Promise<LiveFrameAnalysisResponse> {
  const formData = new FormData();
  formData.append("image", image, `live-frame-${Math.round(timestamp * 1000)}.jpg`);
  formData.append("timestamp", String(timestamp));

  const { data } = await apiClient.post<LiveFrameAnalysisResponse>(
    "/api/analyze-frame",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    }
  );
  return data;
}
