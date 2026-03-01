"use client";

import Link from "next/link";

export default function ResultsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <p className="section-label mb-2">Results</p>
        <h1 className="text-3xl font-bold text-white">Inspection results</h1>
        <p className="text-gray-300 text-sm mt-2">
          Select an audit from your history to view its full report.
        </p>
      </div>

      <div className="rounded-2xl p-10 text-center"
           style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)" }}>
        <svg className="mx-auto mb-4 opacity-20" width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="6" y="4" width="28" height="32" rx="4" stroke="white" strokeWidth="2"/>
          <path d="M13 16h14M13 22h14M13 28h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="30" cy="30" r="8" fill="#080808" stroke="white" strokeWidth="2"/>
          <path d="M30 26v4l2 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p className="text-gray-200 text-sm mb-6">
          To view a report, upload a video or open an audit from your history.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href="/upload" className="btn-primary text-sm">
            New audit
          </Link>
          <Link href="/history" className="btn-ghost text-sm">
            View history
          </Link>
        </div>
      </div>
    </div>
  );
}
