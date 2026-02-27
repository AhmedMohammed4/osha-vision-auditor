import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "OSHA Vision Auditor",
  description: "AI-powered worksite safety compliance inspection",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        <Providers>
          {/* Navbar */}
          <header className="glass sticky top-0 z-50 border-b border-white/5">
            <div className="max-w-7xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center shrink-0"
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
              </div>

              {/* Right side pill */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/5 bg-white/3">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-gray-500 font-medium">AI Active</span>
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
