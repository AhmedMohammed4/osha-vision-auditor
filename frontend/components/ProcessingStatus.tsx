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
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      {/* Animated spinner */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-gray-800" />
        <div className="absolute inset-0 rounded-full border-4 border-yellow-500 border-t-transparent animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          🔍
        </div>
      </div>

      {/* Status text */}
      <div className="text-center space-y-1">
        <p className="text-white font-semibold text-lg animate-pulse">{message}</p>
        <p className="text-gray-500 text-sm">{subMessage}</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-yellow-500 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
