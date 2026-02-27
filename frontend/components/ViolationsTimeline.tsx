"use client";

import type { Violation } from "@/types";

interface ViolationsTimelineProps {
  violations: Violation[];
  duration: number; // seconds
  onSeek: (timestamp: number) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const VIOLATION_COLORS: Record<string, string> = {
  helmet_violation: "#F97316", // orange
  vest_violation: "#60A5FA",   // blue
};

const VIOLATION_LABELS: Record<string, string> = {
  helmet_violation: "Helmet",
  vest_violation: "Vest",
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
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Violations Timeline
        </h2>
        <div className="flex gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            Helmet ({helmetCount})
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-400 inline-block" />
            Vest ({vestCount})
          </span>
        </div>
      </div>

      {/* Timeline bar */}
      <div className="relative">
        {/* Track */}
        <div className="h-3 bg-gray-800 rounded-full w-full relative overflow-visible">
          {/* Violation markers */}
          {violations.map((v) => {
            const position = (v.timestamp / duration) * 100;
            const color = VIOLATION_COLORS[v.violation_type] ?? "#EAB308";
            const label = VIOLATION_LABELS[v.violation_type] ?? v.violation_type;

            return (
              <button
                key={v.id}
                onClick={() => onSeek(v.timestamp)}
                title={`${label} at ${formatTime(v.timestamp)} (conf: ${(v.confidence * 100).toFixed(0)}%)`}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5
                           rounded-full border-2 border-gray-950 hover:scale-150
                           transition-transform duration-150 cursor-pointer z-10"
                style={{
                  left: `${position}%`,
                  backgroundColor: color,
                }}
              />
            );
          })}
        </div>

        {/* Time labels */}
        <div className="flex justify-between mt-1.5 text-xs text-gray-600">
          <span>{formatTime(0)}</span>
          <span>{formatTime(duration / 2)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {violations.length === 0 && (
        <p className="text-gray-600 text-sm text-center py-2">
          No violations detected in this video.
        </p>
      )}
    </div>
  );
}
