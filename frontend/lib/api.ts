import axios from "axios";
import type { Video, Violation, UploadResponse, ReportResponse } from "@/types";

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 300_000, // 5 min — processing can take time
});

export async function warmUpBackend(): Promise<void> {
  await apiClient.get("/health", { timeout: 90_000 });
}

/**
 * Upload a video file to the backend.
 * Returns the new video_id.
 */
export async function uploadVideo(file: File, token: string): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const { data } = await apiClient.post<UploadResponse>(
    "/api/upload-video",
    formData,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return data;
}

/**
 * Start an audit or reconnect to the existing run for this upload.
 */
export async function startProcessing(videoId: string, token: string): Promise<void> {
  await apiClient.post(`/api/process-video/${videoId}`, undefined, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function cancelProcessing(videoId: string, token: string): Promise<void> {
  await apiClient.post(`/api/video/${videoId}/cancel`, undefined, {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 15_000,
  });
}

export async function getSavedDemo(token: string): Promise<string> {
  const { data } = await apiClient.get<{ video_id: string }>("/api/demo", {
    headers: { Authorization: `Bearer ${token}` },
    timeout: 90_000,
  });
  return data.video_id;
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
  const { data } = await apiClient.get<Video>(`/api/video/${videoId}`, { timeout: 15_000 });
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
