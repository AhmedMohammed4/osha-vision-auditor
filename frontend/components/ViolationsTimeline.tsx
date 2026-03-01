"use client";

import type { Violation } from "@/types";

interface ViolationsTimelineProps {
  violations: Violation[];
  duration: number;
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

export default function ViolationsTimeline({
  violations,
  duration,
  onSeek,
  activeViolationId,
  onViolationClick,
}: ViolationsTimelineProps) {
  if (duration <= 0) return null;

  const typeSet = Array.from(new Set(violations.map((v) => v.violation_type)));

  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="section-label">Violations Timeline</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-end text-xs text-gray-500">
          {typeSet.map((type) => (
            <span key={type} className="flex items-center gap-1.5 shrink-0">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ backgroundColor: violationColor(type) }}
              />
              {violationLabel(type)} ({violations.filter((v) => v.violation_type === type).length})
            </span>
          ))}
        </div>
      </div>

      {violations.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="12" stroke="#34d399" strokeWidth="1.5" opacity="0.4"/>
            <path d="M9 14L12 17L19 10" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-gray-600 text-sm">No violations detected</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <div className="relative h-6 flex items-center">
            <div className="absolute inset-y-0 left-0 right-0 flex items-center">
              <div className="w-full h-2 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }} />
            </div>

            {violations.map((v) => {
              const position = Math.max(0, Math.min(100, (v.timestamp / duration) * 100));
              const color = violationColor(v.violation_type);
              const isActive = v.id === activeViolationId;

              return (
                <button
                  key={v.id}
                  onClick={() => { onSeek(v.timestamp); onViolationClick(v); }}
                  title={`${violationLabel(v.violation_type)} at ${formatTime(v.timestamp)} · ${(v.confidence * 100).toFixed(0)}% confidence`}
                  className="absolute -translate-x-1/2 transition-all duration-150 cursor-pointer z-10"
                  style={{
                    left: `${position}%`,
                    width: isActive ? "16px" : "12px",
                    height: isActive ? "16px" : "12px",
                    borderRadius: "50%",
                    backgroundColor: color,
                    boxShadow: isActive
                      ? `0 0 0 3px rgba(255,255,255,0.15), 0 0 8px ${color}`
                      : `0 0 0 2px #090909`,
                  }}
                />
              );
            })}
          </div>

          <div className="flex justify-between text-xs text-gray-700 select-none">
            <span>{formatTime(0)}</span>
            <span>{formatTime(duration / 2)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
