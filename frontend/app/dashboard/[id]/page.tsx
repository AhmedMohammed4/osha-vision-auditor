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

const VideoPlayer = dynamic(() => import("@/components/VideoPlayer"), {
  ssr: false,
  loading: () => (
    <div className="aspect-video rounded-2xl flex items-center justify-center"
         style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.07)" }}>
      <p className="text-gray-400 text-sm">Loading player...</p>
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
  const [activeViolationId, setActiveViolationId] = useState<string | null>(null);

  const { data: video, isLoading: videoLoading, error: videoError } = useQuery({
    queryKey: ["video", videoId],
    queryFn: () => getVideo(videoId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === "completed" || status === "failed") return false;
      return 2000;
    },
  });

  const { data: violations = [] } = useQuery({
    queryKey: ["violations", videoId],
    queryFn: () => getViolations(videoId),
    enabled: video?.status === "completed",
  });

  const { data: reportData } = useQuery({
    queryKey: ["report", videoId],
    queryFn: () => getReport(videoId),
    enabled: video?.status === "completed",
  });

  function handleSeek(seconds: number) {
    playerRef.current?.seekTo(seconds);
  }

  function handleViolationClick(violation: import("@/types").Violation) {
    setActiveViolationId(violation.id);
    playerRef.current?.seekTo(violation.timestamp);
  }

  /* ── Loading ── */
  if (videoLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <ProcessingStatus message="Loading video data..." subMessage="" />
      </div>
    );
  }

  /* ── Error / not found ── */
  if (videoError || !video) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="card flex flex-col items-center gap-4 py-16 text-center">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
               style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 6V10M10 14H10.01" stroke="#ef4444" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="10" cy="10" r="8" stroke="#ef4444" strokeWidth="1.5"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold">Video not found</p>
            <p className="text-gray-600 text-sm mt-1">The video ID "{videoId}" does not exist.</p>
          </div>
          <button onClick={() => router.push("/")} className="btn-primary">
            Upload a new video
          </button>
        </div>
      </div>
    );
  }

  // Build a count per violation type for the summary sidebar
  const violationCounts = violations.reduce<Record<string, number>>((acc, v) => {
    acc[v.violation_type] = (acc[v.violation_type] ?? 0) + 1;
    return acc;
  }, {});
  const violationTypes = Object.entries(violationCounts).sort((a, b) => b[1] - a[1]);

  const statusStyles: Record<string, { bg: string; border: string; color: string }> = {
    completed: { bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.2)", color: "#34d399" },
    processing: { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.12)", color: "#d0d0d0" },
    failed:   { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "#ef4444" },
    uploaded: { bg: "rgba(107,114,128,0.1)", border: "rgba(107,114,128,0.2)", color: "#9ca3af" },
  };
  const statusStyle = statusStyles[video.status] ?? statusStyles.uploaded;

  return (
    <div className="max-w-6xl mx-auto space-y-5 animate-fade-in-up">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            onClick={() => router.push("/")}
            className="btn-ghost text-xs mb-2 flex items-center gap-1"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back to upload
          </button>
          <h1 className="text-xl font-bold text-white truncate">{video.filename}</h1>
          <p className="text-gray-600 text-xs mt-0.5">
            {new Date(video.uploaded_at).toLocaleString()}
            {video.duration ? ` · ${Math.round(video.duration)}s` : ""}
          </p>
        </div>

        {/* Status badge */}
        <div
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border"
          style={{ background: statusStyle.bg, borderColor: statusStyle.border, color: statusStyle.color }}
        >
          {video.status === "processing" && (
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                  style={{ background: statusStyle.color }} />
          )}
          {video.status.charAt(0).toUpperCase() + video.status.slice(1)}
        </div>
      </div>

      {/* Processing overlay */}
      {video.status === "processing" && (
        <div className="card">
          <ProcessingStatus />
        </div>
      )}

      {/* Failed */}
      {video.status === "failed" && (
        <div className="card"
             style={{ background: "rgba(239,68,68,0.06)", borderColor: "rgba(239,68,68,0.2)" }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl shrink-0 flex items-center justify-center"
                 style={{ background: "rgba(239,68,68,0.12)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 5V8M8 11H8.01" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="8" cy="8" r="6.5" stroke="#ef4444" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Processing failed</p>
              <p className="text-gray-500 text-xs mt-0.5">
                An error occurred during video analysis. Please try uploading again.
              </p>
              <button onClick={() => router.push("/")} className="btn-primary mt-3 text-xs px-4 py-2">
                Upload again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed dashboard */}
      {video.status === "completed" && (
        <>
          {/* Top row: video + sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Video player — 2/3 */}
            <div className="lg:col-span-2 space-y-2">
              {video.video_url ? (
                <VideoPlayer
                  ref={playerRef}
                  url={video.video_url}
                  onDuration={(d) => setVideoDuration(d)}
                />
              ) : (
                <div className="aspect-video rounded-2xl flex items-center justify-center"
                     style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <p className="text-gray-400 text-sm">No video URL available</p>
                </div>
              )}
              <p className="text-gray-700 text-xs text-center">
                Click any violation in the timeline or table to jump to that moment
              </p>
            </div>

            {/* Sidebar — 1/3 */}
            <div className="space-y-4">
              {/* Risk meter card */}
              <div className="card flex flex-col items-center py-6">
                <RiskMeter score={video.risk_score ?? 0} />
              </div>

              {/* Violation summary */}
              <div className="card space-y-3">
                <p className="section-label">Violation Breakdown</p>
                <div className="space-y-2">
                  {violationTypes.length === 0 ? (
                    <p className="text-gray-600 text-xs">No violations detected</p>
                  ) : (
                    violationTypes.map(([type, count]) => {
                      const label = type.split("_").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
                      return (
                        <div key={type} className="flex justify-between items-center">
                          <span className="text-gray-400 text-xs truncate pr-2">{label}</span>
                          <span className="text-white font-bold tabular-nums text-sm shrink-0">{count}</span>
                        </div>
                      );
                    })
                  )}
                  {violationTypes.length > 0 && (
                    <div className="flex justify-between items-center pt-2"
                         style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                      <span className="text-gray-400 text-xs">Total</span>
                      <span className="text-white font-bold tabular-nums">{violations.length}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Duration stat */}
              {video.duration && (
                <div className="stat-card">
                  <p className="section-label">Duration</p>
                  <p className="text-white font-bold text-lg">
                    {Math.floor(video.duration / 60)}:{String(Math.round(video.duration % 60)).padStart(2, "0")}
                  </p>
                  <p className="text-gray-600 text-xs">{Math.ceil(video.duration)} frames sampled</p>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <ViolationsTimeline
            violations={violations}
            duration={videoDuration || video.duration || 0}
            onSeek={handleSeek}
            activeViolationId={activeViolationId}
            onViolationClick={handleViolationClick}
          />

          {/* Violations table */}
          <ViolationsTable
            violations={violations}
            onSeek={handleSeek}
            activeViolationId={activeViolationId}
            onViolationClick={handleViolationClick}
          />

          {/* AI Safety Report */}
          {reportData?.report && (
            <div className="card">
              <button
                onClick={() => setReportExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-left group"
              >
                <p className="section-label">AI Safety Report</p>
                <div className="flex items-center gap-1.5 text-gray-600 group-hover:text-gray-400
                                transition-colors text-xs">
                  {reportExpanded ? "Collapse" : "Expand"}
                  <svg
                    width="12" height="12" viewBox="0 0 12 12" fill="none"
                    className="transition-transform duration-200"
                    style={{ transform: reportExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  >
                    <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>

              {!reportExpanded && (
                <p className="mt-3 text-gray-600 text-sm leading-relaxed line-clamp-2">
                  {reportData.report.substring(0, 140)}…
                </p>
              )}

              {reportExpanded && (
                <div className="mt-3 rounded-xl p-4"
                     style={{ background: "#080808", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <pre className="text-gray-300 text-sm whitespace-pre-wrap font-sans leading-relaxed">
                    {reportData.report}
                  </pre>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
