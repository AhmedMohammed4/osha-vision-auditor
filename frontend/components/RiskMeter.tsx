"use client";

interface RiskMeterProps {
  score: number; // 0–100
}

function getRiskColor(score: number): string {
  if (score >= 67) return "#ef4444";
  if (score >= 34) return "#f59e0b";
  return "#34d399";
}

function getRiskLabel(score: number): string {
  if (score >= 67) return "High Risk";
  if (score >= 34) return "Moderate";
  return "Low Risk";
}

function getRiskBg(score: number): string {
  if (score >= 67) return "rgba(239,68,68,0.1)";
  if (score >= 34) return "rgba(245,158,11,0.1)";
  return "rgba(52,211,153,0.1)";
}

function getRiskBorder(score: number): string {
  if (score >= 67) return "rgba(239,68,68,0.25)";
  if (score >= 34) return "rgba(245,158,11,0.25)";
  return "rgba(52,211,153,0.25)";
}

export default function RiskMeter({ score }: RiskMeterProps) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const color = getRiskColor(clampedScore);
  const label = getRiskLabel(clampedScore);

  // SVG semicircle arc — radius 54, center (64, 70)
  const radius = 54;
  const circumference = Math.PI * radius; // ~169.6
  const strokeDashoffset = circumference * (1 - clampedScore / 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <p className="section-label">Risk Score</p>

      <div className="relative w-44 h-[90px]">
        <svg viewBox="0 0 128 76" className="w-full h-full overflow-visible">
          {/* Track */}
          <path
            d="M 10 70 A 54 54 0 0 1 118 70"
            fill="none"
            stroke="#1e1e30"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Score arc */}
          <path
            d="M 10 70 A 54 54 0 0 1 118 70"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(.4,0,.2,1), stroke 0.4s ease",
              filter: `drop-shadow(0 0 6px ${color}60)`,
            }}
          />
          {/* Score number */}
          <text
            x="64"
            y="62"
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill="white"
            fontFamily="inherit"
          >
            {clampedScore}
          </text>
          {/* /100 */}
          <text
            x="64"
            y="74"
            textAnchor="middle"
            fontSize="9"
            fill="#4b5563"
            fontFamily="inherit"
          >
            / 100
          </text>
        </svg>
      </div>

      {/* Label pill */}
      <div
        className="px-3 py-1 rounded-full text-xs font-semibold tracking-wide border"
        style={{
          backgroundColor: getRiskBg(clampedScore),
          color,
          borderColor: getRiskBorder(clampedScore),
        }}
      >
        {label}
      </div>
    </div>
  );
}
