"use client";

interface ProcessingStatusProps {
  message?: string;
  subMessage?: string;
}

export default function ProcessingStatus({
  message = "Analyzing video for OSHA violations...",
  subMessage = "Extracting frames and running AI detection",
}: ProcessingStatusProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-5">
      {/* Spinner */}
      <div className="relative w-16 h-16">
        {/* Static ring */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
        </svg>
        {/* Spinning arc */}
        <svg className="absolute inset-0 w-full h-full animate-spin" viewBox="0 0 64 64"
             style={{ animationDuration: "1.2s" }}>
          <circle
            cx="32" cy="32" r="28"
            fill="none"
            stroke="#ffffff"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray="44 132"
          />
        </svg>
        {/* Center icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="3" fill="#ffffff" />
            <path d="M10 3V5M10 15V17M3 10H5M15 10H17" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5.05 5.05L6.46 6.46M13.54 13.54L14.95 14.95M14.95 5.05L13.54 6.46M6.46 13.54L5.05 14.95"
                  stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
          </svg>
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-1.5">
        <p className="text-white font-semibold text-sm">{message}</p>
        <p className="text-gray-600 text-xs">{subMessage}</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: "rgba(255,255,255,0.35)", animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}
