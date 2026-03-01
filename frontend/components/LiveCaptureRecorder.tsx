"use client";

import { useEffect, useRef, useState } from "react";

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

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export default function LiveCaptureRecorder({ onFileReady, onReset, disabled = false }: LiveCaptureRecorderProps) {
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const activeStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [captureState, setCaptureState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null;
    if (captureState === "recording") {
      timerId = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (timerId) clearInterval(timerId);
    };
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
        onFileReady(file);
      };

      recorder.start(1000);
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
    setRecordingSeconds(0);
    setCaptureState("idle");
    setError(null);
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
        Live capture uses your device camera and saves a local clip before upload.
      </p>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
