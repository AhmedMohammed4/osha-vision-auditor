"use client";

import { useEffect, useRef } from "react";
import type { Violation } from "@/types";

interface ViolationsTableProps {
  violations: Violation[];
  onSeek: (timestamp: number) => void;
  activeViolationId?: string | null;
  onViolationClick: (violation: Violation) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function violationColor(type: string): string {
  if (["fall_hazard", "no_fall_harness", "electrical_hazard", "excavation_hazard"].includes(type))
    return "#ef4444";
  if (["no_hard_hat", "unsafe_ladder", "scaffold_violation", "fire_hazard"].includes(type))
    return "#f97316";
  if (["no_eye_protection", "no_safety_vest", "no_gloves", "improper_footwear"].includes(type))
    return "#60a5fa";
  return "#f59e0b";
}

function violationLabel(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ViolationsTable({
  violations,
  onSeek,
  activeViolationId,
  onViolationClick,
}: ViolationsTableProps) {
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  // Scroll active row into view whenever it changes
  useEffect(() => {
    if (activeViolationId && rowRefs.current[activeViolationId]) {
      rowRefs.current[activeViolationId]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [activeViolationId]);

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
            All workers appear to be in compliance with OSHA safety requirements.
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
            <tr style={{ borderBottom: "1px solid #251212" }}>
              {["Timestamp", "Violation", "Description", "Confidence", "Frame"].map((h) => (
                <th key={h}
                    className="text-left py-2.5 px-3 font-medium text-xs tracking-widest uppercase"
                    style={{ color: "#4a4a6a" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {violations.map((v) => {
              const isActive = v.id === activeViolationId;
              const color = violationColor(v.violation_type);

              return (
                <tr
                  key={v.id}
                  ref={(el) => { rowRefs.current[v.id] = el; }}
                  onClick={() => { onSeek(v.timestamp); onViolationClick(v); }}
                  className="cursor-pointer transition-colors duration-100"
                  style={{
                    borderBottom: "1px solid rgba(37,18,18,0.7)",
                    backgroundColor: isActive ? "rgba(220,38,38,0.06)" : undefined,
                    borderLeft: isActive ? `2px solid ${color}` : "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "rgba(220,38,38,0.02)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "";
                  }}
                >
                  {/* Timestamp */}
                  <td className="py-3 px-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); onSeek(v.timestamp); onViolationClick(v); }}
                      className="flex items-center gap-1.5 font-mono text-xs rounded-lg px-2 py-1 transition-colors"
                      style={{
                        background: "rgba(220,38,38,0.08)",
                        color: "#f87171",
                        border: "1px solid rgba(220,38,38,0.18)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.15)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(220,38,38,0.08)")}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M3 2L8 5L3 8V2Z" fill="currentColor"/>
                      </svg>
                      {formatTime(v.timestamp)}
                    </button>
                  </td>

                  {/* Type badge */}
                  <td className="py-3 px-3">
                    <span
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: `${color}18`,
                        color: color,
                        border: `1px solid ${color}30`,
                      }}
                    >
                      {violationLabel(v.violation_type)}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="py-3 px-3 max-w-xs">
                    <p className="text-gray-400 text-xs leading-relaxed line-clamp-2">
                      {v.description ?? "—"}
                    </p>
                  </td>

                  {/* Confidence */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-14 h-1 rounded-full overflow-hidden" style={{ background: "#251212" }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(v.confidence * 100).toFixed(0)}%`, background: color }}
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
                      <span style={{ color: "#3a1818" }} className="text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
