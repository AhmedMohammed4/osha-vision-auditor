"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import VideoUploader from "@/components/VideoUploader";
import ProcessingStatus from "@/components/ProcessingStatus";
import { uploadVideo, startProcessing, getVideo } from "@/lib/api";

type PageState = "idle" | "uploading" | "processing" | "error";

const FEATURES = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L4 5.5V10.5C4 13.8 6.6 16.9 10 18C13.4 16.9 16 13.8 16 10.5V5.5L10 2Z"
          stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 10L9 12L13 8" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    label: "PPE Detection",
    desc: "Hard hat & vest compliance via YOLOv8",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="#f59e0b" strokeWidth="1.5"/>
        <path d="M10 6V10L13 12" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    label: "Frame Analysis",
    desc: "Sampled at 1 FPS across full video",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M3 14L7 10L10 13L14 8L17 11" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="2" y="2" width="16" height="16" rx="3" stroke="#f59e0b" strokeWidth="1.5"/>
      </svg>
    ),
    label: "Risk Scoring",
    desc: "Weighted 0–100 severity score",
  },
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 4H16V14H4V4Z" stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M7 17H13" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M10 14V17" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 8H13M7 11H11" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
    label: "AI Report",
    desc: "OSHA-standard recommendations",
  },
];

export default function UploadPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("idle");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: videoData } = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => getVideo(videoId!),
    enabled: !!videoId && pageState === "processing",
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000;
    },
  });

  useEffect(() => {
    if (videoData?.status === "completed" && videoId) {
      router.push(`/dashboard/${videoId}`);
    }
    if (videoData?.status === "failed") {
      setPageState("error");
      setErrorMessage("Video processing failed. Please try again.");
    }
  }, [videoData, videoId, router]);

  async function handleStartAnalysis() {
    if (!selectedFile) return;
    try {
      setPageState("uploading");
      setErrorMessage(null);
      const uploadResult = await uploadVideo(selectedFile);
      setVideoId(uploadResult.video_id);
      setPageState("processing");
      await startProcessing(uploadResult.video_id);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.detail || err?.message || "An unexpected error occurred."
      );
      setPageState("error");
    }
  }

  function handleReset() {
    setPageState("idle");
    setVideoId(null);
    setSelectedFile(null);
    setErrorMessage(null);
  }

  const isActive = pageState === "idle" || pageState === "error";

  return (
    <div className="grid-bg min-h-[calc(100vh-3.5rem)] -mt-10 -mx-5 sm:-mx-8 px-5 sm:px-8 pt-10">
      <div className="max-w-2xl mx-auto">

        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border mb-6"
               style={{ borderColor: "rgba(245,158,11,0.25)", background: "rgba(245,158,11,0.06)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-semibold text-amber-400 tracking-wide">AI-Powered OSHA Compliance</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
            Worksite Safety<br />
            <span style={{ color: "#f59e0b" }}>Audit System</span>
          </h1>
          <p className="text-gray-500 text-base leading-relaxed max-w-md mx-auto">
            Upload a construction site video. We detect PPE violations frame-by-frame
            and generate an OSHA compliance report in seconds.
          </p>
        </div>

        {/* Upload card */}
        <div className="card glow-amber animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {isActive ? (
            <div className="space-y-4">
              <VideoUploader onFileSelected={setSelectedFile} disabled={false} />

              {selectedFile && (
                <button onClick={handleStartAnalysis} className="btn-primary w-full py-3 text-sm">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M6 5.5L11 8L6 10.5V5.5Z" fill="currentColor"/>
                  </svg>
                  Analyze for OSHA Violations
                </button>
              )}

              {errorMessage && (
                <div className="rounded-xl px-4 py-3 text-sm"
                     style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <p className="text-red-400 font-medium mb-0.5">Analysis failed</p>
                  <p className="text-red-400/70">{errorMessage}</p>
                  <button onClick={handleReset} className="text-xs text-red-500 hover:text-red-300 mt-2 underline">
                    Try again
                  </button>
                </div>
              )}
            </div>
          ) : pageState === "uploading" ? (
            <ProcessingStatus message="Uploading video..." subMessage="Securely transferring to storage" />
          ) : (
            <ProcessingStatus message="Analyzing for violations..." subMessage="YOLOv8 scanning each frame at 1 FPS" />
          )}
        </div>

        {/* Feature grid */}
        {isActive && (
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up"
               style={{ animationDelay: "0.2s" }}>
            {FEATURES.map((f) => (
              <div key={f.label} className="card-hover p-4 text-center rounded-2xl">
                <div className="flex justify-center mb-3">{f.icon}</div>
                <p className="text-white text-xs font-semibold mb-1">{f.label}</p>
                <p className="text-gray-600 text-xs leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
