"use client";

import type { Violation } from "@/types";

interface ViolationsTableProps {
  violations: Violation[];
  onSeek: (timestamp: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ViolationsTable({ violations, onSeek }: ViolationsTableProps) {
  if (violations.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 py-12">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20
                        flex items-center justify-center">
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M19 6L9 16L4 11" stroke="#34d399" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">No violations detected</p>
          <p className="text-gray-600 text-xs mt-1">
            All workers appear to be wearing required PPE.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <p className="section-label">Violations Log</p>
        <span className="text-xs text-gray-600">
          {violations.length} violation{violations.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: "1px solid #1e1e30" }}>
              {["Timestamp", "Violation", "Confidence", "Frame"].map((h) => (
                <th key={h}
                    className="text-left py-2.5 px-3 font-medium text-xs tracking-widest uppercase"
                    style={{ color: "#4a4a6a" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {violations.map((v) => (
              <tr
                key={v.id}
                onClick={() => onSeek(v.timestamp)}
                className="cursor-pointer transition-colors duration-100 group"
                style={{ borderBottom: "1px solid rgba(30,30,48,0.6)" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(245,158,11,0.04)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              >
                {/* Timestamp */}
                <td className="py-3 px-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); onSeek(v.timestamp); }}
                    className="flex items-center gap-1.5 font-mono text-xs rounded-lg px-2 py-1
                               transition-colors"
                    style={{
                      background: "rgba(245,158,11,0.08)",
                      color: "#f59e0b",
                      border: "1px solid rgba(245,158,11,0.15)",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.15)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(245,158,11,0.08)")}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M3 2L8 5L3 8V2Z" fill="currentColor"/>
                    </svg>
                    {formatTime(v.timestamp)}
                  </button>
                </td>

                {/* Type badge */}
                <td className="py-3 px-3">
                  <span className={v.violation_type === "helmet_violation" ? "badge-helmet" : "badge-vest"}>
                    {v.violation_type === "helmet_violation" ? (
                      <>
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M2 7.5C2 5.015 3.567 3 5.5 3S9 5.015 9 7.5H2Z"
                                fill="currentColor" opacity="0.7"/>
                          <path d="M1.5 7.5H9.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
                        </svg>
                        No Hard Hat
                      </>
                    ) : (
                      <>
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                          <path d="M2 3L5.5 2L9 3V7L5.5 9L2 7V3Z"
                                stroke="currentColor" strokeWidth="1" strokeLinejoin="round" fill="currentColor" opacity="0.3"/>
                        </svg>
                        No Safety Vest
                      </>
                    )}
                  </span>
                </td>

                {/* Confidence */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-14 h-1 rounded-full overflow-hidden"
                         style={{ background: "#1e1e30" }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(v.confidence * 100).toFixed(0)}%`,
                          background: "#f59e0b",
                        }}
                      />
                    </div>
                    <span className="text-gray-500 text-xs tabular-nums">
                      {(v.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>

                {/* Frame */}
                <td className="py-3 px-3">
                  {v.frame_url ? (
                    <a
                      href={v.frame_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs underline transition-colors"
                      style={{ color: "#60a5fa" }}
                    >
                      View
                    </a>
                  ) : (
                    <span style={{ color: "#2a2a40" }} className="text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
