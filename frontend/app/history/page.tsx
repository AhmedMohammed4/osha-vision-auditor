"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function HistoryPage() {
  const { user, loading } = useAuth();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 text-center">
        <p className="section-label mb-2">Audit history</p>
        <h1 className="text-3xl font-bold text-white">Your past audits</h1>
        <p className="text-gray-300 text-sm mt-2">
          Every video you've submitted and its inspection results.
        </p>
      </div>

      {loading ? null : !user ? (
        <div className="rounded-2xl p-10 text-center"
             style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-gray-200 text-sm mb-4">Sign in to see your audit history.</p>
          <Link href="/auth?tab=signin" className="btn-primary text-sm">
            Sign in
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl p-10 text-center"
             style={{ background: "#0f0f0f", border: "1px solid rgba(255,255,255,0.07)" }}>
          <svg className="mx-auto mb-4 opacity-20" width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="4" y="6" width="32" height="28" rx="4" stroke="white" strokeWidth="2"/>
            <path d="M4 14h32" stroke="white" strokeWidth="2"/>
            <path d="M13 22h14M13 28h8" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-gray-200 text-sm mb-6">No audits yet. Upload a worksite video to get started.</p>
          <Link href="/upload" className="btn-primary text-sm">
            Run your first audit
          </Link>
        </div>
      )}
    </div>
  );
}
