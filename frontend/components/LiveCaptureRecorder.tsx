"use client";

import { useEffect, useRef, useState } from "react";
import { analyzeFrame } from "@/lib/api";
import type { LiveViolation } from "@/types";

interface LiveCaptureRecorderProps {
  onFileReady: (file: File) => void;
  onReset?: () => void;
  disabled?: boolean;
}

type CaptureState = "idle" | "recording" | "recorded";

const MIME_TYPES = [
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];
const LIVE_ANALYSIS_INTERVAL_MS = 4000;

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function formatViolationLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function LiveCaptureRecorder({ onFileReady, onReset, disabled = false }: LiveCaptureRecorderProps) {
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const analysisInFlightRef = useRef(false);
  const recordingSecondsRef = useRef(0);

  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveViolations, setLiveViolations] = useState<LiveViolation[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState("Live analysis starts when recording begins.");
  const [analysisSummary, setAnalysisSummary] = useState("The live monitor will separate non-worksite scenes, clear scans, and analysis failures.");
  const [lastAnalyzedAt, setLastAnalyzedAt] = useState<number | null>(null);

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null;
    if (captureState === "recording") {
      timerId = setInterval(() => {
        setRecordingSeconds((s) => {
          const nextValue = s + 1;
          recordingSecondsRef.current = nextValue;
          return nextValue;
        });
      }, 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [captureState]);

  useEffect(() => {
    if (captureState !== "recording") return;

    void analyzeCurrentFrame();

    const analysisTimer = setInterval(() => {
      void analyzeCurrentFrame();
    }, LIVE_ANALYSIS_INTERVAL_MS);

    return () => clearInterval(analysisTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureState]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordedVideoUrl]);

  function stopCamera() {
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => track.stop());
      activeStreamRef.current = null;
    }
  }

  function capturePreviewFrame(): Promise<Blob | null> {
    const video = videoPreviewRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return Promise.resolve(null);
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return Promise.resolve(null);
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });
  }

  async function analyzeCurrentFrame() {
    if (analysisInFlightRef.current || captureState !== "recording") return;

    const frameBlob = await capturePreviewFrame();
    if (!frameBlob) return;

    analysisInFlightRef.current = true;
    setAnalysisStatus("AI is checking the live camera feed...");
    setAnalysisSummary("Reviewing the latest frame.");

    try {
      const result = await analyzeFrame(frameBlob, recordingSecondsRef.current);
      setLastAnalyzedAt(result.timestamp);

      if (result.violations.length > 0) {
        setLiveViolations((existing) => {
          const merged = [...result.violations, ...existing];
          return merged.slice(0, 6);
        });
        setAnalysisStatus(`${result.violations.length} live issue${result.violations.length === 1 ? "" : "s"} flagged.`);
        setAnalysisSummary(result.summary);
      } else if (result.status === "non_worksite") {
        setAnalysisStatus("Current frame looks like a non-worksite scene.");
        setAnalysisSummary(result.summary);
      } else if (result.status === "analysis_failed") {
        setAnalysisStatus("Live analysis is temporarily unavailable.");
        setAnalysisSummary(result.summary);
      } else {
        setAnalysisStatus("No visible OSHA issues in the latest live scan.");
        setAnalysisSummary(result.summary);
      }
    } catch (err: any) {
      setAnalysisStatus("Live analysis is temporarily unavailable.");
      setAnalysisSummary(
        err?.response?.data?.detail ||
        err?.message ||
        "The backend could not analyze the current frame."
      );
    } finally {
      analysisInFlightRef.current = false;
    }
  }

  async function startRecording() {
    setError(null);

    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Live capture is not supported in this browser.");
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setError("No supported recorder format found. Please upload a video instead.");
      return;
    }

    try {
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoUrl(null);
      }

      setLiveViolations([]);
      setLastAnalyzedAt(null);
      setAnalysisStatus("Starting live analysis...");
      setAnalysisSummary("Waiting for the first live frame.");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });

      activeStreamRef.current = stream;
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
      }

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        stopCamera();
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const extension = mimeType.includes("webm") ? "webm" : "mp4";
        const file = new File([blob], `live-capture-${Date.now()}.${extension}`, {
          type: blob.type,
        });

        const localUrl = URL.createObjectURL(blob);
        setRecordedVideoUrl(localUrl);
        setCaptureState("recorded");
        setAnalysisStatus("Live capture saved. You can upload the full clip for a complete report.");
        setAnalysisSummary("Live status reflects only sampled frames during recording.");
        onFileReady(file);
      };

      recorder.start(1000);
      recordingSecondsRef.current = 0;
      setRecordingSeconds(0);
      setCaptureState("recording");
    } catch (err: any) {
      setError(err?.message || "Could not start live capture.");
      stopCamera();
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function resetRecording() {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    recordingSecondsRef.current = 0;
    setRecordingSeconds(0);
    setCaptureState("idle");
    setError(null);
    setLiveViolations([]);
    setLastAnalyzedAt(null);
    setAnalysisStatus("Live analysis starts when recording begins.");
    setAnalysisSummary("The live monitor will separate non-worksite scenes, clear scans, and analysis failures.");
    onReset?.();
  }

  const isRecording = captureState === "recording";

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/30 p-3">
        <div className="aspect-video w-full overflow-hidden rounded-lg bg-black/70">
          {captureState === "recorded" && recordedVideoUrl ? (
            <video src={recordedVideoUrl} controls className="h-full w-full object-contain" />
          ) : (
            <video
              ref={videoPreviewRef}
              autoPlay
              muted
              playsInline
              className="h-full w-full object-cover"
            />
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {captureState !== "recording" ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={disabled}
              className="inline-flex items-center justify-center rounded-xl border border-white/20 px-4 py-2 text-xs font-semibold text-gray-200 transition hover:border-white/35 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start live capture
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              className="btn-primary px-4 py-2 text-xs"
            >
              Stop capture
            </button>
          )}

          {captureState === "recorded" && (
            <button type="button" onClick={resetRecording} className="text-xs text-gray-400 underline">
              Record again
            </button>
          )}

          {isRecording && (
            <span className="inline-flex items-center gap-1 text-xs text-red-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
              Recording {recordingSeconds}s
            </span>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-600">
        Live capture scans the camera feed every few seconds while recording, then saves the full clip for a deeper report.
      </p>

      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-gray-300">Live AI monitor</p>
          {lastAnalyzedAt !== null && (
            <span className="text-[11px] text-gray-500">
              Last scan at {Math.round(lastAnalyzedAt)}s
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-gray-400">{analysisStatus}</p>
        <p className="mt-1 text-[11px] text-gray-500">{analysisSummary}</p>

        {liveViolations.length > 0 ? (
          <div className="mt-3 space-y-2">
            {liveViolations.map((violation, index) => (
              <div
                key={`${violation.timestamp}-${violation.violation_type}-${index}`}
                className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-red-300">
                    {formatViolationLabel(violation.violation_type)}
                  </span>
                  <span className="text-[11px] text-red-200/80">
                    {Math.round(violation.timestamp)}s
                  </span>
                </div>
                {violation.description && (
                  <p className="mt-1 text-[11px] leading-relaxed text-red-100/80">
                    {violation.description}
                  </p>
                )}
                {violation.osha_citation && (
                  <p className="mt-1 text-[11px] text-red-200/70">
                    {violation.osha_citation}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[11px] text-gray-600">
            {captureState === "recording"
              ? "No live issues are currently listed. The status above explains whether the latest frame looked clear, non-worksite, or unavailable."
              : "Start recording to begin live checks. The saved video can still be uploaded afterward for the full timeline and report."}
          </p>
        )}
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
