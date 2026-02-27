"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import VideoUploader from "@/components/VideoUploader";
import ProcessingStatus from "@/components/ProcessingStatus";
import { uploadVideo, startProcessing, getVideo } from "@/lib/api";

type PageState = "idle" | "uploading" | "processing" | "error";

export default function UploadPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("idle");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Poll for video status once processing has started
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

  // Navigate to dashboard on completion
  useEffect(() => {
    if (videoData?.status === "completed" && videoId) {
      router.push(`/dashboard/${videoId}`);
    }
    if (videoData?.status === "failed") {
      setPageState("error");
      setErrorMessage("Video processing failed. Please try again.");
    }
  }, [videoData, videoId, router]);

  async function handleFileSelected(file: File) {
    setSelectedFile(file);
    setErrorMessage(null);
  }

  async function handleStartAnalysis() {
    if (!selectedFile) return;

    try {
      setPageState("uploading");
      setErrorMessage(null);

      // Upload the video
      const uploadResult = await uploadVideo(selectedFile);
      setVideoId(uploadResult.video_id);

      // Trigger processing
      setPageState("processing");
      await startProcessing(uploadResult.video_id);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.message ||
        "An unexpected error occurred.";
      setErrorMessage(msg);
      setPageState("error");
    }
  }

  function handleReset() {
    setPageState("idle");
    setVideoId(null);
    setSelectedFile(null);
    setErrorMessage(null);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-950/50 border border-yellow-800 rounded-full text-yellow-400 text-xs font-medium mb-4">
          <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
          AI-Powered OSHA Compliance
        </div>
        <h1 className="text-4xl font-bold text-white mb-3">
          Worksite Safety Audit
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed">
          Upload a worksite video to automatically detect PPE violations and
          generate an OSHA compliance report.
        </p>
      </div>

      {/* Main content card */}
      <div className="card space-y-6">
        {pageState === "idle" || pageState === "error" ? (
          <>
            <VideoUploader
              onFileSelected={handleFileSelected}
              disabled={false}
            />

            {selectedFile && (
              <button
                onClick={handleStartAnalysis}
                className="btn-primary w-full text-center"
              >
                🔍 Analyze Video for OSHA Violations
              </button>
            )}

            {errorMessage && (
              <div className="bg-red-950/40 border border-red-800 rounded-lg px-4 py-3">
                <p className="text-red-400 text-sm font-medium">⚠ Error</p>
                <p className="text-red-300 text-sm mt-0.5">{errorMessage}</p>
                <button
                  onClick={handleReset}
                  className="text-xs text-red-400 hover:text-red-300 mt-2 underline"
                >
                  Try again
                </button>
              </div>
            )}
          </>
        ) : pageState === "uploading" ? (
          <ProcessingStatus
            message="Uploading video..."
            subMessage="Securely storing your video for analysis"
          />
        ) : (
          <ProcessingStatus
            message="Analyzing video for OSHA violations..."
            subMessage="Running YOLOv8 detection on sampled frames"
          />
        )}
      </div>

      {/* Feature highlights */}
      {pageState === "idle" && (
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: "🦺", label: "PPE Detection", desc: "Helmet & vest compliance" },
            { icon: "📊", label: "Risk Scoring", desc: "0–100 weighted score" },
            { icon: "📋", label: "AI Report", desc: "OSHA recommendations" },
          ].map((item) => (
            <div key={item.label} className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
              <div className="text-2xl mb-2">{item.icon}</div>
              <p className="text-white text-sm font-medium">{item.label}</p>
              <p className="text-gray-600 text-xs mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
