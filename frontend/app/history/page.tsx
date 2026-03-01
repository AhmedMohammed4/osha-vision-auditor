"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getVideos } from "@/lib/api";
import type { Video } from "@/types";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
    " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatusBadge({ status }: { status: Video["status"] }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    completed:  { bg: "rgba(52,211,153,0.12)", color: "#34d399", label: "Completed" },
    processing: { bg: "rgba(251,191,36,0.12)", color: "#fbbf24", label: "Processing" },
    uploaded:   { bg: "rgba(148,163,184,0.12)", color: "#94a3b8", label: "Queued" },
    failed:     { bg: "rgba(239,68,68,0.12)",  color: "#ef4444", label: "Failed" },
  };
  const s = styles[status] ?? styles.uploaded;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.color}25` }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
      {s.label}
    </span>
  );
}

function RiskBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color = score >= 67 ? "#ef4444" : score >= 34 ? "#f97316" : "#34d399";
  const label = score >= 67 ? "High Risk" : score >= 34 ? "Moderate" : "Low Risk";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium"
      style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}
    >
      {score} · {label}
    </span>
  );
}

export default function HistoryPage() {
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: getVideos,
  });

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <p className="section-label mb-2">Audit history</p>
        <h1 className="text-3xl font-bold text-white">Your past audits</h1>
        <p className="text-gray-300 text-sm mt-2">
          Every video you've submitted and its inspection results.
        </p>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl h-20 animate-pulse"
                 style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)" }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && videos.length === 0 && (
        <div className="rounded-2xl p-10 text-center"
             style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)" }}>
          <svg className="mx-auto mb-4 opacity-20" width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="6" width="32" height="28" rx="4" stroke="white" strokeWidth="2"/>
            <path d="M4 14h32" stroke="white" strokeWidth="2"/>
            <path d="M13 22h14M13 28h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-gray-200 text-sm mb-6">No audits yet. Upload a worksite video to get started.</p>
          <Link href="/upload" className="btn-primary text-sm">
            Run your first audit
          </Link>
        </div>
      )}

      {/* Video list */}
      {!isLoading && videos.length > 0 && (
        <div className="space-y-3">
          {videos.map((video, index) => (
            <div
              key={video.id}
              className="rounded-2xl px-5 py-4 flex items-center gap-5 transition-colors duration-150"
              style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.14)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
            >
              {/* Index number */}
              <span className="text-xs font-mono tabular-nums shrink-0"
                    style={{ color: "rgba(255,255,255,0.2)", width: "1.5rem", textAlign: "right" }}>
                {String(index + 1).padStart(2, "0")}
              </span>

              {/* Info block */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <StatusBadge status={video.status} />
                  {video.risk_score != null && <RiskBadge score={video.risk_score} />}
                </div>
                <p className="text-gray-500 text-xs mt-1.5">
                  {formatDate(video.uploaded_at)}
                  {video.duration != null && (
                    <span className="ml-3 text-gray-600">
                      {formatDuration(video.duration)}
                    </span>
                  )}
                </p>
              </div>

              {/* Action */}
              {video.status === "completed" ? (
                <Link
                  href={`/dashboard/${video.id}`}
                  className="btn-primary text-xs shrink-0"
                  style={{ padding: "0.375rem 0.875rem" }}
                >
                  View report
                </Link>
              ) : video.status === "processing" || video.status === "uploaded" ? (
                <Link
                  href={`/dashboard/${video.id}`}
                  className="btn-ghost text-xs shrink-0"
                >
                  View status →
                </Link>
              ) : (
                <Link
                  href={`/dashboard/${video.id}`}
                  className="btn-ghost text-xs shrink-0"
                  style={{ color: "#ef4444" }}
                >
                  View error →
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
