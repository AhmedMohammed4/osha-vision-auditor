"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type Tab = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, signIn, signUp } = useAuth();

  const defaultTab = (searchParams.get("tab") as Tab) || "signin";
  const [tab, setTab] = useState<Tab>(defaultTab);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/upload");
  }, [user, loading, router]);

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
    setConfirmed(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    if (tab === "signin") {
      const { error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        setSubmitting(false);
      } else {
        router.push("/upload");
      }
    } else {
      const { error, needsConfirmation } = await signUp(email, password);
      if (error) {
        setError(error.message);
        setSubmitting(false);
      } else if (needsConfirmation) {
        setConfirmed(true);
        setSubmitting(false);
      } else {
        router.push("/upload");
      }
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)] -mt-10 -mx-5 sm:-mx-8 grid lg:grid-cols-[420px_1fr]">

      {/* Left panel — brand / story */}
      <div className="hidden lg:flex flex-col justify-between p-10 relative overflow-hidden"
           style={{ background: "#0b0b0b", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Subtle gradient blob */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none"
             style={{ background: "radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)" }} />

        <div>
          <Link href="/" className="flex items-center gap-2.5 mb-16">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", boxShadow: "none" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="#fff"/>
                <circle cx="7" cy="7" r="2" fill="#fff"/>
              </svg>
            </div>
            <span className="text-white font-bold text-sm tracking-tight">OSHA Vision</span>
          </Link>

          <blockquote className="space-y-4">
            <p className="text-2xl font-semibold leading-snug text-white" style={{ maxWidth: "280px" }}>
              "Every worksite deserves someone watching."
            </p>
            <p className="text-gray-300 text-sm leading-relaxed" style={{ maxWidth: "300px" }}>
              We built this because the gap between "required" and "enforced"
              is where people get hurt.
            </p>
          </blockquote>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 rounded-xl"
               style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                 style={{ background: "rgba(255,255,255,0.06)" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M5 7L6.5 8.5L9 5.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-white text-xs font-semibold">1,069 US construction fatalities in 2023</p>
              <p className="text-gray-600 text-xs mt-0.5">Source: Bureau of Labor Statistics</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl"
               style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                 style={{ background: "rgba(52,211,153,0.1)" }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="5.5" stroke="#34d399" strokeWidth="1.2"/>
                <path d="M4.5 7L6 8.5L9.5 5" stroke="#34d399" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-white text-xs font-semibold">60% were preventable with proper PPE</p>
              <p className="text-gray-600 text-xs mt-0.5">OSHA incident data, 2023</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center px-6 py-12 grid-bg">
        <div className="w-full max-w-sm animate-fade-in-up">

          {confirmed ? (
            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
                   style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M20 8L12 13L4 8" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round"/>
                  <rect x="3" y="6" width="18" height="13" rx="2" stroke="#34d399" strokeWidth="1.5"/>
                </svg>
              </div>
              <div>
                <h2 className="text-white font-bold text-xl">Check your email</h2>
                <p className="text-gray-200 text-sm mt-2 leading-relaxed">
                  We sent a confirmation link to <span className="text-white font-medium">{email}</span>.
                  Click it to activate your account.
                </p>
                <p className="text-gray-700 text-xs mt-3">
                  (To skip confirmation for demos, disable it in your Supabase dashboard under Authentication → Providers → Email.)
                </p>
              </div>
              <button
                onClick={() => { setConfirmed(false); setTab("signin"); }}
                className="btn-primary w-full py-2.5 text-sm mt-2"
              >
                Go to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">
                  {tab === "signin" ? "Welcome back" : "Create an account"}
                </h1>
                <p className="text-gray-300 text-sm mt-1">
                  {tab === "signin"
                    ? "Sign in to access your audits."
                    : "Start auditing worksites for free."}
                </p>
              </div>

              {/* Tab toggle */}
              <div className="flex p-1 rounded-xl mb-6"
                   style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.07)" }}>
                {(["signin", "signup"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => switchTab(t)}
                    className="flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-150"
                    style={tab === t
                      ? { background: "#1a1a1a", color: "#ffffff", border: "1px solid rgba(255,255,255,0.13)" }
                      : { color: "#9ca3af", border: "1px solid transparent" }
                    }
                  >
                    {t === "signin" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-200">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-700
                               outline-none transition-all duration-150"
                    style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.07)" }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-gray-200">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === "signup" ? "Minimum 6 characters" : "••••••••"}
                    required
                    minLength={6}
                    autoComplete={tab === "signin" ? "current-password" : "new-password"}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white placeholder-gray-700
                               outline-none transition-all duration-150"
                    style={{ background: "#0e0e0e", border: "1px solid rgba(255,255,255,0.07)" }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.3)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.07)")}
                  />
                </div>

                {/* Error */}
                {error && (
                  <div className="px-3.5 py-2.5 rounded-xl text-xs text-red-400"
                       style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-2.5 text-sm"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2 justify-center">
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 12"/>
                      </svg>
                      {tab === "signin" ? "Signing in..." : "Creating account..."}
                    </span>
                  ) : (
                    tab === "signin" ? "Sign in" : "Create account"
                  )}
                </button>
              </form>

              <p className="text-center text-xs text-gray-600 mt-5">
                {tab === "signin" ? "No account yet? " : "Already have an account? "}
                <button
                  onClick={() => switchTab(tab === "signin" ? "signup" : "signin")}
                  className="text-gray-400 hover:text-white underline transition-colors"
                >
                  {tab === "signin" ? "Sign up free" : "Sign in"}
                </button>
              </p>
            </>
          )}

          <div className="mt-8 text-center">
            <Link href="/" className="text-xs text-gray-700 hover:text-gray-500 transition-colors">
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
