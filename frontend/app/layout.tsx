import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OSHA Vision Auditor",
  description: "AI-powered worksite safety compliance inspection",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <Providers>
          <header className="border-b border-gray-800 bg-gray-950 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center text-gray-950 font-black text-sm">
                O
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-none">
                  OSHA Vision Auditor
                </h1>
                <p className="text-xs text-gray-500 leading-none mt-0.5">
                  AI Safety Compliance Inspector
                </p>
              </div>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
