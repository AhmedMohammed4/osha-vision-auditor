"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import GooeyNavbar from "@/components/navigation/GooeyNavbar";

export default function NavBar() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header
      className="glass sticky top-0 z-50"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* CSS grid: left | center | right — nav always perfectly centered */}
      <div
        className="max-w-7xl mx-auto px-5 sm:px-8 h-14"
        style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}
      >

        {/* Left — wordmark */}
        <Link href="/" className="flex items-center" aria-label="OSHA Vision home">
          <span
            style={{
              fontFamily: "var(--font-space-grotesk)",
              fontWeight: 700,
              fontSize: "0.9375rem",
              letterSpacing: "0.08em",
              color: "#ffffff",
            }}
          >
            OSHA<span style={{ color: "var(--accent)" }}>·</span>VISION
          </span>
        </Link>

        {/* Center — gooey nav (hidden on mobile) */}
        <div className="hidden sm:flex">
          <GooeyNavbar />
        </div>

        {/* Right — auth controls */}
        <div className="flex items-center justify-end gap-3">
          {!loading && (
            <>
              {user ? (
                <>
                  <div className="flex items-center gap-2 pl-1">
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.07)",
                        color: "#ffffff",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      {initial}
                    </div>
                    <span className="text-white text-xs hidden sm:block max-w-[140px] truncate opacity-70">
                      {user.email}
                    </span>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="text-xs text-gray-400 hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/auth?tab=signin" className="btn-ghost text-xs">
                    Sign in
                  </Link>
                  <Link href="/auth?tab=signup" className="btn-primary text-xs px-4 py-2">
                    Get started
                  </Link>
                </>
              )}
            </>
          )}
        </div>

      </div>
    </header>
  );
}
