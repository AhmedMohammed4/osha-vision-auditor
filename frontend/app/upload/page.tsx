"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import VideoUploader from "@/components/VideoUploader";
import ProcessingStatus from "@/components/ProcessingStatus";
import { uploadVideo, startProcessing, getVideo } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type PageState = "idle" | "uploading" | "processing" | "error";

export default function UploadPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [pageState, setPageState] = useState<PageState>("idle");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) router.replace("/auth");
  }, [user, loading, router]);

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

  if (loading || !user) return null;

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

          <h1 className="text-4xl font-bold tracking-tight text-white mb-3 leading-tight">
            Run a worksite audit
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">
            Drop in any construction video. We scan every second for missing hard hats
            and safety vests, then score the risk.
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

        {/* Info row */}
        {isActive && (
          <div className="mt-5 flex items-center justify-center gap-6 animate-fade-in-up text-xs text-gray-700"
               style={{ animationDelay: "0.2s" }}>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 3.5V8.5L6 11L1 8.5V3.5L6 1Z" stroke="#4a4a6a" strokeWidth="1" strokeLinejoin="round"/>
              </svg>
              YOLOv8 detection
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <circle cx="6" cy="6" r="4.5" stroke="#4a4a6a" strokeWidth="1"/>
                <path d="M6 3.5V6L7.5 7.5" stroke="#4a4a6a" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              1 FPS sampling
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1.5" y="2" width="9" height="8" rx="1.5" stroke="#4a4a6a" strokeWidth="1"/>
                <path d="M3.5 5H8.5M3.5 7H6.5" stroke="#4a4a6a" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              GPT-4o report
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1.5L10 4V8L6 10.5L2 8V4L6 1.5Z" stroke="#4a4a6a" strokeWidth="1" strokeLinejoin="round"/>
                <path d="M4 6L5.5 7.5L8.5 4.5" stroke="#4a4a6a" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              OSHA framework
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
