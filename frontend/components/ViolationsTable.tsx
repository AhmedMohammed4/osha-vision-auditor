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

export default function ViolationsTable({
  violations,
  onSeek,
}: ViolationsTableProps) {
  if (violations.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-white font-medium">No violations detected</p>
        <p className="text-gray-500 text-sm mt-1">
          All workers appear to be wearing required PPE.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
          Violations Log
        </h2>
        <span className="text-xs text-gray-500">{violations.length} violation{violations.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
                Timestamp
              </th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
                Violation
              </th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
                Confidence
              </th>
              <th className="text-left py-2.5 px-3 text-gray-500 font-medium text-xs uppercase tracking-wider">
                Frame
              </th>
            </tr>
          </thead>
          <tbody>
            {violations.map((v, idx) => (
              <tr
                key={v.id}
                onClick={() => onSeek(v.timestamp)}
                className={`
                  border-b border-gray-800/50 cursor-pointer
                  hover:bg-yellow-500/5 transition-colors duration-100
                  ${idx % 2 === 0 ? "" : "bg-gray-900/30"}
                `}
              >
                {/* Timestamp — click to seek */}
                <td className="py-3 px-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSeek(v.timestamp);
                    }}
                    className="font-mono text-yellow-400 hover:text-yellow-300
                               bg-yellow-950/30 hover:bg-yellow-950/60 px-2 py-0.5
                               rounded text-xs transition-colors"
                  >
                    ▶ {formatTime(v.timestamp)}
                  </button>
                </td>

                {/* Violation type badge */}
                <td className="py-3 px-3">
                  <span
                    className={
                      v.violation_type === "helmet_violation"
                        ? "badge-helmet"
                        : "badge-vest"
                    }
                  >
                    {v.violation_type === "helmet_violation"
                      ? "⛑ No Hard Hat"
                      : "🦺 No Safety Vest"}
                  </span>
                </td>

                {/* Confidence bar */}
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ width: `${(v.confidence * 100).toFixed(0)}%` }}
                      />
                    </div>
                    <span className="text-gray-400 text-xs">
                      {(v.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </td>

                {/* Frame thumbnail or placeholder */}
                <td className="py-3 px-3">
                  {v.frame_url ? (
                    <a
                      href={v.frame_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-blue-400 hover:text-blue-300 text-xs underline"
                    >
                      View frame
                    </a>
                  ) : (
                    <span className="text-gray-700 text-xs">—</span>
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
