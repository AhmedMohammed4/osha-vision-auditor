"use client";

import type { Violation } from "@/types";

interface ViolationsTimelineProps {
  violations: Violation[];
  duration: number;
  onSeek: (timestamp: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const VIOLATION_COLORS: Record<string, string> = {
  helmet_violation: "#f97316",
  vest_violation: "#60a5fa",
};

const VIOLATION_LABELS: Record<string, string> = {
  helmet_violation: "Hard Hat",
  vest_violation: "Safety Vest",
};

export default function ViolationsTimeline({
  violations,
  duration,
  onSeek,
}: ViolationsTimelineProps) {
  if (duration <= 0) return null;

  const helmetCount = violations.filter((v) => v.violation_type === "helmet_violation").length;
  const vestCount = violations.filter((v) => v.violation_type === "vest_violation").length;

  return (
    <div className="card space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="section-label">Violations Timeline</p>
        <div className="flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block shrink-0" />
            Hard Hat ({helmetCount})
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-400 inline-block shrink-0" />
            Safety Vest ({vestCount})
          </span>
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
          {/* Track */}
          <div className="relative h-5 flex items-center">
            {/* Background bar */}
            <div className="absolute inset-y-0 left-0 right-0 flex items-center">
              <div className="w-full h-2 rounded-full" style={{ background: "#1e1e30" }} />
            </div>

            {/* Violation markers */}
            {violations.map((v) => {
              const position = Math.max(0, Math.min(100, (v.timestamp / duration) * 100));
              const color = VIOLATION_COLORS[v.violation_type] ?? "#f59e0b";
              const label = VIOLATION_LABELS[v.violation_type] ?? v.violation_type;

              return (
                <button
                  key={v.id}
                  onClick={() => onSeek(v.timestamp)}
                  title={`${label} at ${formatTime(v.timestamp)} · ${(v.confidence * 100).toFixed(0)}% confidence`}
                  className="absolute w-3 h-3 rounded-full -translate-x-1/2
                             hover:scale-150 transition-transform duration-150
                             cursor-pointer z-10 ring-2 ring-[#07070f]"
                  style={{ left: `${position}%`, backgroundColor: color }}
                />
              );
            })}
          </div>

          {/* Time labels */}
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
