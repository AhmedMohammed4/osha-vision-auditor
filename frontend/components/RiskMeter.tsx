"use client";

interface RiskMeterProps {
  score: number; // 0–100
}

function getRiskColor(score: number): string {
  if (score >= 67) return "#EF4444"; // red
  if (score >= 34) return "#EAB308"; // yellow
  return "#22C55E"; // green
}

function getRiskLabel(score: number): string {
  if (score >= 67) return "HIGH RISK";
  if (score >= 34) return "MODERATE";
  return "LOW RISK";
}

export default function RiskMeter({ score }: RiskMeterProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = getRiskColor(clampedScore);
  const label = getRiskLabel(clampedScore);

  // SVG arc parameters
  const radius = 70;
  const circumference = Math.PI * radius; // half circle
  const strokeDashoffset = circumference * (1 - clampedScore / 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-28">
        <svg
          viewBox="0 0 160 90"
          className="w-full h-full"
          overflow="visible"
        >
          {/* Background arc */}
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke="#374151"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Score arc */}
          <path
            d="M 10 80 A 70 70 0 0 1 150 80"
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 0.8s ease, stroke 0.4s ease" }}
          />

          {/* Score number */}
          <text
            x="80"
            y="72"
            textAnchor="middle"
            fontSize="28"
            fontWeight="700"
            fill="white"
          >
            {clampedScore}
          </text>
        </svg>
      </div>

      {/* Risk label */}
      <div
        className="mt-1 px-3 py-1 rounded-full text-xs font-bold tracking-wider"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {label}
      </div>

      <p className="mt-1 text-gray-500 text-xs">Risk Score</p>
    </div>
  );
}
