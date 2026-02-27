"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { VideoPlayerHandle } from "@/components/VideoPlayer";
import RiskMeter from "@/components/RiskMeter";
import ViolationsTimeline from "@/components/ViolationsTimeline";
import ViolationsTable from "@/components/ViolationsTable";
import ProcessingStatus from "@/components/ProcessingStatus";
import { getVideo, getViolations, getReport } from "@/lib/api";

// Dynamic import prevents SSR issues with ReactPlayer
const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
      <p className="text-gray-600 text-sm">Loading player...</p>
    </div>
  ),
});

export default function DashboardPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const playerRef = useRef<VideoPlayerHandle>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [reportExpanded, setReportExpanded] = useState(false);

  // Fetch video metadata — polls while processing
  const { data: video, isLoading: videoLoading, error: videoError } = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => getVideo(videoId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000;
    },
  });

  // Fetch violations once video is completed
  const { data: violations = [] } = useQuery({
    queryKey: ["violations", videoId],
    queryFn: () => getViolations(videoId),
    enabled: video?.status === "completed",
  });

  // Fetch LLM report once video is completed
  const { data: reportData } = useQuery({
    queryKey: ["report", videoId],
    queryFn: () => getReport(videoId),
    enabled: video?.status === "completed",
  });

  function handleSeek(seconds: number) {
    playerRef.current?.seekTo(seconds);
  }

  if (videoLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <ProcessingStatus message="Loading video data..." subMessage="" />
      </div>
    );
  }

  if (videoError || !video) {
    return (
      <div className="max-w-6xl mx-auto card text-center py-12">
        <p className="text-red-400 text-lg font-medium mb-2">Video not found</p>
        <p className="text-gray-500 text-sm mb-4">
          The video ID "{videoId}" does not exist.
        </p>
        <button onClick={() => router.push("/")} className="btn-primary">
          Upload a new video
        </button>
      </div>
    );
  }

  const helmetViolations = violations.filter(
    (v) => v.violation_type === "helmet_violation"
  );
  const vestViolations = violations.filter(
    (v) => v.violation_type === "vest_violation"
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-gray-300 text-sm mb-2 flex items-center gap-1 transition-colors"
          >
            ← Back to upload
          </button>
          <h1 className="text-2xl font-bold text-white">{video.filename}</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Uploaded {new Date(video.uploaded_at).toLocaleString()}
            {video.duration ? ` · ${Math.round(video.duration)}s` : ""}
          </p>
        </div>

        {/* Status badge */}
        <div
          className={`
            px-3 py-1.5 rounded-full text-sm font-medium border shrink-0
            ${video.status === "completed" ? "bg-green-950/50 border-green-800 text-green-400" : ""}
            ${video.status === "processing" ? "bg-yellow-950/50 border-yellow-800 text-yellow-400" : ""}
            ${video.status === "failed" ? "bg-red-950/50 border-red-800 text-red-400" : ""}
            ${video.status === "uploaded" ? "bg-gray-800 border-gray-700 text-gray-400" : ""}
          `}
        >
          {video.status === "processing" && (
            <span className="inline-block w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1.5 animate-pulse" />
          )}
          {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
        </div>
      </div>

      {/* Still processing */}
      {video.status === "processing" && (
        <div className="card">
          <ProcessingStatus />
        </div>
      )}

      {/* Failed */}
      {video.status === "failed" && (
        <div className="card bg-red-950/20 border-red-900">
          <p className="text-red-400 font-medium">Processing failed</p>
          <p className="text-gray-500 text-sm mt-1">
            An error occurred during video analysis. Please try uploading again.
          </p>
          <button
            onClick={() => router.push("/")}
            className="btn-primary mt-4"
          >
            Upload again
          </button>
        </div>
      )}

      {/* Completed dashboard */}
      {video.status === "completed" && (
        <>
          {/* Top row: video + metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video player — takes 2/3 width */}
            <div className="lg:col-span-2 space-y-3">
              {video.video_url ? (
                <VideoPlayer
                  ref={playerRef}
                  url={video.video_url}
                  onDuration={(d) => setVideoDuration(d)}
                />
              ) : (
                <div className="aspect-video bg-gray-900 rounded-xl flex items-center justify-center">
                  <p className="text-gray-600">No video URL available</p>
                </div>
              )}
              <p className="text-gray-600 text-xs text-center">
                Click any violation timestamp to jump to that moment in the video
              </p>
            </div>

            {/* Metrics panel — 1/3 width */}
            <div className="space-y-4">
              {/* Risk meter */}
              <div className="card flex flex-col items-center py-6">
                <RiskMeter score={video.risk_score ?? 0} />
              </div>

              {/* Violation counts */}
              <div className="card space-y-3">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Violation Summary
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
                      Hard Hat Violations
                    </span>
                    <span className="text-white font-bold">{helmetViolations.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
                      Safety Vest Violations
                    </span>
                    <span className="text-white font-bold">{vestViolations.length}</span>
                  </div>
                  <div className="border-t border-gray-800 pt-2 flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Total Violations</span>
                    <span className="text-white font-bold">{violations.length}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Violations timeline */}
          <ViolationsTimeline
            violations={violations}
            duration={videoDuration || video.duration || 0}
            onSeek={handleSeek}
          />

          {/* Violations table */}
          <ViolationsTable violations={violations} onSeek={handleSeek} />

          {/* LLM Safety Report */}
          {reportData?.report && (
            <div className="card space-y-3">
              <button
                onClick={() => setReportExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-left"
              >
                <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
                  AI Safety Report
                </h2>
                <span className="text-gray-500 text-xs">
                  {reportExpanded ? "▲ Collapse" : "▼ Expand"}
                </span>
              </button>

              {reportExpanded && (
                <div className="mt-2 bg-gray-950 rounded-lg p-4 border border-gray-800">
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {reportData.report}
                  </pre>
                </div>
              )}

              {!reportExpanded && (
                <p className="text-gray-600 text-sm truncate">
                  {reportData.report.substring(0, 120)}...
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
