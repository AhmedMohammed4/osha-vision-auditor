"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function NavBar() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  // Initial letter for avatar
  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="glass sticky top-0 z-50" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0 transition-all duration-200 group-hover:shadow-lg"
               style={{ boxShadow: "0 0 12px rgba(245,158,11,0.4)" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1L13 4.5V9.5L7 13L1 9.5V4.5L7 1Z" fill="#07070f" strokeWidth="0"/>
              <circle cx="7" cy="7" r="2" fill="#07070f"/>
            </svg>
          </div>
          <div className="leading-none">
            <span className="text-sm font-bold text-white tracking-tight">OSHA Vision</span>
            <span className="text-xs text-gray-600 block mt-0.5">Safety Auditor</span>
          </div>
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {!loading && (
            <>
              {user ? (
                /* Logged-in state */
                <>
                  {pathname !== "/upload" && (
                    <Link
                      href="/upload"
                      className="btn-ghost text-xs flex items-center gap-1.5"
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <rect x="1" y="2" width="11" height="9" rx="2" stroke="currentColor" strokeWidth="1.2"/>
                        <path d="M6.5 4.5V8M6.5 4.5L4.5 6.5M6.5 4.5L8.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      New audit
                    </Link>
                  )}

                  {/* User avatar + email */}
                  <div className="flex items-center gap-2 pl-1">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                         style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)" }}>
                      {initial}
                    </div>
                    <span className="text-gray-400 text-xs hidden sm:block max-w-[140px] truncate">
                      {user.email}
                    </span>
                  </div>

                  <button
                    onClick={handleSignOut}
                    className="text-xs text-gray-600 hover:text-gray-300 transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    Sign out
                  </button>
                </>
              ) : (
                /* Logged-out state */
                <>
                  <Link href="/auth?tab=signin" className="btn-ghost text-xs">
                    Sign in
                  </Link>
                  <Link href="/auth?tab=signup"
                        className="btn-primary text-xs px-4 py-2">
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
